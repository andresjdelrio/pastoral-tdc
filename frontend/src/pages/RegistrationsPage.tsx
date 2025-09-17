import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function RegistrationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Registrations</h1>
        <p className="text-muted-foreground">
          View and manage event registrations
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registration List</CardTitle>
          <CardDescription>
            Search, filter, and view all event registrations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Registration list component will be implemented here</p>
        </CardContent>
      </Card>
    </div>
  );
}