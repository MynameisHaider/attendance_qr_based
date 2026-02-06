"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner"; // Agar sonner use kar rahay hain, warna alert use kar lein

export default function CreateStudentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    admission_number: "",
    full_name: "",
    class: "",
    section: "",
    parent_name: "",
    parent_contact: "",
    gender: "",
    date_of_birth: "",
    address: "",
    photo_url: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from("students").insert([
        {
          admission_number: formData.admission_number,
          full_name: formData.full_name,
          class: formData.class,
          section: formData.section,
          parent_name: formData.parent_name,
          parent_contact: formData.parent_contact,
          gender: formData.gender,
          date_of_birth: formData.date_of_birth || null,
          address: formData.address,
          photo_url: formData.photo_url,
          metadata: {}, // Empty JSON object for metadata
        },
      ]);

      if (error) throw error;

      toast.success("Student added successfully!");
      router.push("/admin/students");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Add Single Student</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Admission Number *</Label>
                <Input
                  required
                  value={formData.admission_number}
                  onChange={(e) => setFormData({...formData, admission_number: e.target.value})}
                  placeholder="STU123"
                />
              </div>
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Class *</Label>
                <Input
                  required
                  value={formData.class}
                  onChange={(e) => setFormData({...formData, class: e.target.value})}
                  placeholder="10th"
                />
              </div>
              <div className="space-y-2">
                <Label>Section *</Label>
                <Input
                  required
                  value={formData.section}
                  onChange={(e) => setFormData({...formData, section: e.target.value})}
                  placeholder="A"
                />
              </div>
              <div className="space-y-2">
                <Label>Parent Name</Label>
                <Input
                  value={formData.parent_name}
                  onChange={(e) => setFormData({...formData, parent_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Parent Contact</Label>
                <Input
                  value={formData.parent_contact}
                  onChange={(e) => setFormData({...formData, parent_contact: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <select 
                  className="w-full border rounded p-2 text-sm"
                  value={formData.gender}
                  onChange={(e) => setFormData({...formData, gender: e.target.value})}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
              />
            </div>

            <div className="pt-4 flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Student"}
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}