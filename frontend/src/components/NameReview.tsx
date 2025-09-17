import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, SkipForward, Users, BarChart3, Play, Loader2 } from 'lucide-react';
import axios from 'axios';

interface Registrant {
  id: number;
  full_name: string;
  raw_full_name: string;
  normalized_full_name: string;
  canonical_full_name: string;
  rut: string;
  university_email: string;
  career: string;
  phone: string;
  audience: string;
}

interface ReviewItem {
  id: number;
  similarity: number;
  status: string;
  audience: string;
  created_at: string;
  decided_at?: string;
  decided_by?: string;
  left_context: string;
  right_context: string;
  left_registrant: Registrant;
  right_registrant: Registrant;
}

interface ReviewQueueResponse {
  items: ReviewItem[];
  total_count: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}

interface DuplicateStats {
  registrants: {
    total: number;
    normalized: number;
    normalization_percentage: number;
  };
  review_queue: {
    total: number;
    pending: number;
    accepted: number;
    rejected: number;
    skipped: number;
    completion_percentage: number;
  };
  by_audience: {
    estudiantes: number;
    colaboradores: number;
  };
}

export default function NameReview() {
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [stats, setStats] = useState<DuplicateStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [audienceFilter, setAudienceFilter] = useState('');
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [showDecisionDialog, setShowDecisionDialog] = useState(false);
  const [canonicalName, setCanonicalName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [detectionRunning, setDetectionRunning] = useState(false);
  const [backfillRunning, setBackfillRunning] = useState(false);

  const itemsPerPage = 10;

  // Load review queue
  const loadReviewQueue = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        status: statusFilter,
        page: currentPage.toString(),
        limit: itemsPerPage.toString()
      });

      if (audienceFilter) {
        params.append('audience', audienceFilter);
      }

      const response = await axios.get(`/api/names/review?${params}`);
      const data: ReviewQueueResponse = response.data;

      setReviewItems(data.items);
      setTotalItems(data.total_count);
    } catch (error) {
      console.error('Error loading review queue:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load statistics
  const loadStats = async () => {
    try {
      const response = await axios.get('/api/names/stats');
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  // Run backfill process
  const runBackfill = async () => {
    try {
      setBackfillRunning(true);
      const response = await axios.post('/api/names/backfill');
      console.log('Backfill result:', response.data);
      await loadStats();
    } catch (error) {
      console.error('Error running backfill:', error);
      alert('Error running backfill process. Check console for details.');
    } finally {
      setBackfillRunning(false);
    }
  };

  // Run duplicate detection
  const runDetection = async () => {
    try {
      setDetectionRunning(true);
      const response = await axios.post('/api/names/detect-duplicates', {
        audience: audienceFilter || null,
        limit: 1000
      });
      console.log('Detection result:', response.data);
      await Promise.all([loadReviewQueue(), loadStats()]);
    } catch (error) {
      console.error('Error running detection:', error);
      alert('Error running duplicate detection. Check console for details.');
    } finally {
      setDetectionRunning(false);
    }
  };

  // Make review decision
  const makeDecision = async (decision: 'accept' | 'reject' | 'skip') => {
    if (!selectedItem) return;

    try {
      setProcessing(true);

      const request = {
        decision,
        decided_by: 'admin', // In a real app, this would be the current user
        canonical_name: decision === 'accept' ? canonicalName : undefined
      };

      await axios.post(`/api/names/review/${selectedItem.id}/decision`, request);

      setShowDecisionDialog(false);
      setSelectedItem(null);
      setCanonicalName('');

      // Reload queue and stats
      await Promise.all([loadReviewQueue(), loadStats()]);
    } catch (error) {
      console.error('Error making decision:', error);
      alert('Error processing decision. Check console for details.');
    } finally {
      setProcessing(false);
    }
  };

  // Open decision dialog
  const openDecisionDialog = (item: ReviewItem, suggestedDecision?: 'accept' | 'reject') => {
    setSelectedItem(item);
    setShowDecisionDialog(true);

    // Pre-fill canonical name suggestion for accept decisions
    if (suggestedDecision === 'accept') {
      // Use the canonical name from left registrant as default
      setCanonicalName(item.left_registrant.canonical_full_name || item.left_registrant.normalized_full_name);
    }
  };

  useEffect(() => {
    loadReviewQueue();
  }, [currentPage, statusFilter, audienceFilter]);

  useEffect(() => {
    loadStats();
  }, []);

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('nameReview.title')}</h1>
          <p className="text-muted-foreground">{t('nameReview.description')}</p>
        </div>
        <div className="space-x-2">
          <Button
            onClick={runBackfill}
            disabled={backfillRunning}
            variant="outline"
          >
            {backfillRunning ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <BarChart3 className="h-4 w-4 mr-2" />
            )}
            {t('nameReview.backfillNames')}
          </Button>
          <Button
            onClick={runDetection}
            disabled={detectionRunning}
          >
            {detectionRunning ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {t('nameReview.runDetection')}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('nameReview.stats.normalizationProgress')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.registrants.normalization_percentage}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.registrants.normalized} {t('nameReview.stats.of')} {stats.registrants.total} {t('nameReview.stats.registrants')}
              </p>
              <Progress value={stats.registrants.normalization_percentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('nameReview.stats.reviewProgress')}</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.review_queue.completion_percentage}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.review_queue.total - stats.review_queue.pending} {t('nameReview.stats.of')} {stats.review_queue.total} {t('nameReview.stats.reviewed')}
              </p>
              <Progress value={stats.review_queue.completion_percentage} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('nameReview.stats.queueStatus')}</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{t('nameReview.stats.pending')}:</span>
                  <Badge variant="secondary">{stats.review_queue.pending}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t('nameReview.stats.accepted')}:</span>
                  <Badge variant="default">{stats.review_queue.accepted}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t('nameReview.stats.rejected')}:</span>
                  <Badge variant="destructive">{stats.review_queue.rejected}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('nameReview.filters.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">{t('nameReview.filters.status')}</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('nameReview.filters.selectStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">{t('nameReview.filters.pending')}</SelectItem>
                  <SelectItem value="accepted">{t('nameReview.filters.accepted')}</SelectItem>
                  <SelectItem value="rejected">{t('nameReview.filters.rejected')}</SelectItem>
                  <SelectItem value="skipped">{t('nameReview.filters.skipped')}</SelectItem>
                  <SelectItem value="all">{t('nameReview.filters.all')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="audience">{t('nameReview.filters.audience')}</Label>
              <Select value={audienceFilter} onValueChange={setAudienceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('nameReview.filters.allAudiences')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('nameReview.filters.allAudiences')}</SelectItem>
                  <SelectItem value="estudiantes">{t('nameReview.filters.students')}</SelectItem>
                  <SelectItem value="colaboradores">{t('nameReview.filters.collaborators')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Queue */}
      <Card>
        <CardHeader>
          <CardTitle>{t('nameReview.queue.title')}</CardTitle>
          <CardDescription>
            {t('nameReview.queue.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : reviewItems.length === 0 ? (
            <Alert>
              <AlertDescription>
                {t('nameReview.queue.noItems')}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('nameReview.table.similarity')}</TableHead>
                    <TableHead>{t('nameReview.table.audience')}</TableHead>
                    <TableHead>{t('nameReview.table.leftRegistrant')}</TableHead>
                    <TableHead>{t('nameReview.table.rightRegistrant')}</TableHead>
                    <TableHead>{t('nameReview.table.status')}</TableHead>
                    <TableHead>{t('nameReview.table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviewItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant={item.similarity >= 95 ? "destructive" : item.similarity >= 90 ? "default" : "secondary"}>
                          {item.similarity.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.audience}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{item.left_registrant.full_name}</div>
                          <div className="text-sm text-muted-foreground">{item.left_registrant.career}</div>
                          <div className="text-xs text-muted-foreground">{item.left_registrant.rut}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{item.right_registrant.full_name}</div>
                          <div className="text-sm text-muted-foreground">{item.right_registrant.career}</div>
                          <div className="text-xs text-muted-foreground">{item.right_registrant.rut}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          item.status === 'pending' ? 'secondary' :
                          item.status === 'accepted' ? 'default' :
                          item.status === 'rejected' ? 'destructive' : 'outline'
                        }>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.status === 'pending' && (
                          <div className="space-x-1">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => openDecisionDialog(item, 'accept')}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {t('nameReview.actions.accept')}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openDecisionDialog(item, 'reject')}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              {t('nameReview.actions.reject')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => makeDecision('skip')}
                            >
                              <SkipForward className="h-3 w-3 mr-1" />
                              {t('nameReview.actions.skip')}
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center space-x-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    {t('nameReview.pagination.previous')}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {t('nameReview.pagination.pageOf', { current: currentPage, total: totalPages })}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    {t('nameReview.pagination.next')}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Decision Dialog */}
      <Dialog open={showDecisionDialog} onOpenChange={setShowDecisionDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('nameReview.dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('nameReview.dialog.description')}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{t('nameReview.dialog.leftRegistrant')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><strong>{t('nameReview.dialog.name')}:</strong> {selectedItem.left_registrant.full_name}</div>
                    <div><strong>{t('nameReview.dialog.normalized')}:</strong> {selectedItem.left_registrant.normalized_full_name}</div>
                    <div><strong>{t('nameReview.dialog.canonical')}:</strong> {selectedItem.left_registrant.canonical_full_name}</div>
                    <div><strong>{t('nameReview.dialog.rut')}:</strong> {selectedItem.left_registrant.rut || 'N/A'}</div>
                    <div><strong>{t('nameReview.dialog.email')}:</strong> {selectedItem.left_registrant.university_email || 'N/A'}</div>
                    <div><strong>{t('nameReview.dialog.career')}:</strong> {selectedItem.left_registrant.career || 'N/A'}</div>
                    <div><strong>{t('nameReview.dialog.phone')}:</strong> {selectedItem.left_registrant.phone || 'N/A'}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">{t('nameReview.dialog.rightRegistrant')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div><strong>{t('nameReview.dialog.name')}:</strong> {selectedItem.right_registrant.full_name}</div>
                    <div><strong>{t('nameReview.dialog.normalized')}:</strong> {selectedItem.right_registrant.normalized_full_name}</div>
                    <div><strong>{t('nameReview.dialog.canonical')}:</strong> {selectedItem.right_registrant.canonical_full_name}</div>
                    <div><strong>{t('nameReview.dialog.rut')}:</strong> {selectedItem.right_registrant.rut || 'N/A'}</div>
                    <div><strong>{t('nameReview.dialog.email')}:</strong> {selectedItem.right_registrant.university_email || 'N/A'}</div>
                    <div><strong>{t('nameReview.dialog.career')}:</strong> {selectedItem.right_registrant.career || 'N/A'}</div>
                    <div><strong>{t('nameReview.dialog.phone')}:</strong> {selectedItem.right_registrant.phone || 'N/A'}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="text-center">
                <Badge variant="default" className="text-lg">
                  {t('nameReview.dialog.similarity')}: {selectedItem.similarity.toFixed(1)}%
                </Badge>
              </div>

              <div>
                <Label htmlFor="canonical-name">{t('nameReview.dialog.canonicalNameLabel')}</Label>
                <Input
                  id="canonical-name"
                  value={canonicalName}
                  onChange={(e) => setCanonicalName(e.target.value)}
                  placeholder={t('nameReview.dialog.canonicalNamePlaceholder')}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDecisionDialog(false)}
              disabled={processing}
            >
              {t('nameReview.dialog.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => makeDecision('reject')}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
              {t('nameReview.dialog.reject')}
            </Button>
            <Button
              variant="outline"
              onClick={() => makeDecision('skip')}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <SkipForward className="h-4 w-4 mr-2" />}
              {t('nameReview.dialog.skip')}
            </Button>
            <Button
              variant="default"
              onClick={() => makeDecision('accept')}
              disabled={processing || !canonicalName.trim()}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
              {t('nameReview.dialog.accept')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}