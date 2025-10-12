import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users } from "lucide-react";

const CreateTestUsers = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const createUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-test-users');
      
      if (error) throw error;

      setResults(data.results);
      toast({
        title: "Success!",
        description: data.message,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Create Test Users</h1>
          <p className="text-muted-foreground">Generate 10 students (enrolled in SENG2011) and 10 admin accounts for testing</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Batch User Creation</CardTitle>
            <CardDescription>
              This will create 20 test accounts (10 students + 10 admins) with complete profiles.
              Students will be enrolled in SENG2011 with skills for partner matching.
              All accounts use password: <code className="bg-muted px-2 py-1 rounded">Test123!</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={createUsers} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Users...
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  Create Test Users
                </>
              )}
            </Button>

            {results && (
              <div className="mt-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Students Created</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        {results.students.map((s: any) => (
                          <li key={s.email} className="text-green-600">✓ {s.email}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Admins Created</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        {results.admins.map((a: any) => (
                          <li key={a.email} className="text-green-600">✓ {a.email}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {results.errors.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg text-destructive">Errors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        {results.errors.map((e: any, i: number) => (
                          <li key={i} className="text-destructive">✗ {e.email}: {e.error}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreateTestUsers;
