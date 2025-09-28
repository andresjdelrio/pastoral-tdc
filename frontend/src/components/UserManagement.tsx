import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2, Edit2, Users, Shield, Key } from 'lucide-react';
import axios from 'axios';

interface User {
  id: string;
  username: string;
  role: string;
}

interface UserManagementProps {
  onClose: () => void;
}

export default function UserManagement({ onClose }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'user'
  });

  const [editUser, setEditUser] = useState({
    username: '',
    role: 'user',
    newPassword: ''
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);

      // Use mock data for demo
      const mockUsers = [
        { id: '1', username: 'admin', role: 'admin' },
        { id: '2', username: 'pastoral', role: 'user' },
        { id: '3', username: 'demo', role: 'user' }
      ];

      // Try to load from localStorage for persistence
      const storedUsers = localStorage.getItem('demo_users');
      if (storedUsers) {
        setUsers(JSON.parse(storedUsers));
      } else {
        setUsers(mockUsers);
        localStorage.setItem('demo_users', JSON.stringify(mockUsers));
      }

      // Try API if available (for future backend integration)
      try {
        const response = await axios.get('/api/auth/users', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        setUsers(response.data);
      } catch (apiError) {
        console.log('API not available, using mock data');
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      setIsLoading(true);

      // Mock user creation for demo
      const newId = String(users.length + 1);
      const createdUser = {
        id: newId,
        username: newUser.username,
        role: newUser.role
      };

      const updatedUsers = [...users, createdUser];
      setUsers(updatedUsers);
      localStorage.setItem('demo_users', JSON.stringify(updatedUsers));

      setNewUser({ username: '', password: '', role: 'user' });
      setIsCreateDialogOpen(false);

      // Try API if available
      try {
        const response = await axios.post('/api/auth/users', newUser, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        });
        // If API succeeds, reload from API
        loadUsers();
      } catch (apiError) {
        console.log('API not available, user created locally');
      }
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error al crear usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    try {
      setIsLoading(true);
      const updateData: any = {
        username: editUser.username,
        role: editUser.role
      };

      if (editUser.newPassword) {
        updateData.password = editUser.newPassword;
      }

      const response = await axios.put(`/api/auth/users/${editingUser.id}`, updateData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      setUsers(users.map(user => user.id === editingUser.id ? response.data : user));
      setEditingUser(null);
      setEditUser({ username: '', role: 'user', newPassword: '' });
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error al actualizar usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (username === 'admin') {
      alert('No puedes eliminar el usuario administrador');
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar el usuario "${username}"?`)) {
      return;
    }

    try {
      setIsLoading(true);
      await axios.delete(`/api/auth/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });

      setUsers(users.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error al eliminar usuario');
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditUser({
      username: user.username,
      role: user.role,
      newPassword: ''
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={onClose} className="flex items-center space-x-2">
          <ArrowLeft className="h-4 w-4" />
          <span>Volver</span>
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center space-x-2">
            <Users className="h-8 w-8" />
            <span>Gestión de Usuarios</span>
          </h1>
          <p className="text-muted-foreground">
            Administra los usuarios del sistema y sus permisos
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Usuarios del Sistema</h2>
          <p className="text-sm text-muted-foreground">
            Total: {users.length} usuarios
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Crear Usuario</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              <DialogDescription>
                Añade un nuevo usuario al sistema
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-username">Nombre de Usuario</Label>
                <Input
                  id="new-username"
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="Ingresa el nombre de usuario"
                />
              </div>
              <div>
                <Label htmlFor="new-password">Contraseña</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Ingresa la contraseña"
                />
              </div>
              <div>
                <Label htmlFor="new-role">Rol</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={handleCreateUser}
                  disabled={isLoading || !newUser.username || !newUser.password}
                  className="flex-1"
                >
                  {isLoading ? 'Creando...' : 'Crear Usuario'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {isLoading && users.length === 0 ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-teal mx-auto mb-4"></div>
            <p>Cargando usuarios...</p>
          </div>
        ) : (
          users.map((user) => (
            <Card key={user.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-brand-teal rounded-full">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{user.username}</h3>
                    <p className="text-sm text-muted-foreground flex items-center space-x-1">
                      <Shield className="h-3 w-3" />
                      <span>{user.role === 'admin' ? 'Administrador' : 'Usuario'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(user)}
                    className="flex items-center space-x-1"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Editar</span>
                  </Button>

                  {user.username !== 'admin' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id, user.username)}
                      className="flex items-center space-x-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Eliminar</span>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica la información del usuario
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-username">Nombre de Usuario</Label>
              <Input
                id="edit-username"
                value={editUser.username}
                onChange={(e) => setEditUser({ ...editUser, username: e.target.value })}
                placeholder="Nombre de usuario"
              />
            </div>
            <div>
              <Label htmlFor="edit-password">Nueva Contraseña (opcional)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editUser.newPassword}
                onChange={(e) => setEditUser({ ...editUser, newPassword: e.target.value })}
                placeholder="Dejar vacío para mantener la actual"
              />
            </div>
            <div>
              <Label htmlFor="edit-role">Rol</Label>
              <Select value={editUser.role} onValueChange={(value) => setEditUser({ ...editUser, role: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={handleEditUser}
                disabled={isLoading || !editUser.username}
                className="flex-1"
              >
                {isLoading ? 'Guardando...' : 'Guardar Cambios'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}