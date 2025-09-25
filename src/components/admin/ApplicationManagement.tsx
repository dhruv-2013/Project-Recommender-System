import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export const ApplicationManagement = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [statusUpdate, setStatusUpdate] = useState({ status: '', note: '' });
  const { toast } = useToast();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        projects:project_id (title, category),
        profiles:applicant_id (full_name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch applications",
        variant: "destructive"
      });
    } else {
      setApplications(data || []);
    }
    setLoading(false);
  };

  const handleStatusUpdate = async () => {
    if (!selectedApplication || !statusUpdate.status) {
      toast({
        title: "Error",
        description: "Please select a status",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from('applications')
      .update({
        status: statusUpdate.status,
        admin_note: statusUpdate.note || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedApplication.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update application status",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Application status updated successfully"
      });
      setSelectedApplication(null);
      setStatusUpdate({ status: '', note: '' });
      fetchApplications();
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'waitlisted': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return <div>Loading applications...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Application Management</h2>
      </div>

      <div className="space-y-4">
        {applications.map((application) => (
          <Card key={application.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {application.projects?.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Applicant: {application.profiles?.full_name} ({application.profiles?.email})
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Type: {application.applicant_type}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(application.status)}>
                    {application.status}
                  </Badge>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedApplication(application);
                          setStatusUpdate({ status: application.status, note: application.admin_note || '' });
                        }}
                      >
                        Update Status
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Update Application Status</DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="status">Status</Label>
                          <Select 
                            value={statusUpdate.status} 
                            onValueChange={(value) => setStatusUpdate(prev => ({ ...prev, status: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="waitlisted">Waitlisted</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="note">Admin Note (Optional)</Label>
                          <Textarea
                            id="note"
                            value={statusUpdate.note}
                            onChange={(e) => setStatusUpdate(prev => ({ ...prev, note: e.target.value }))}
                            placeholder="Add a note for the applicant..."
                            rows={3}
                          />
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setSelectedApplication(null)}>
                            Cancel
                          </Button>
                          <Button onClick={handleStatusUpdate}>
                            Update Status
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Applied:</span> {new Date(application.created_at).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Category:</span> {application.projects?.category}
                </div>
              </div>
              {application.admin_note && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <span className="font-medium">Admin Note:</span> {application.admin_note}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {applications.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No applications found.</p>
        </div>
      )}
    </div>
  );
};