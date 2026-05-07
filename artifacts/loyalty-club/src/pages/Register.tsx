import React, { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRegisterMember } from "@/hooks/use-loyalty";
import { Loader2, CheckCircle2, UserPlus, Gift, MessageCircle } from "lucide-react";
import { Link } from "wouter";

const registerSchema = z.object({
  fullName: z.string().min(2, "נא להזין שם מלא תקין"),
  phone: z.string().regex(/^05\d{8}$/, "מספר טלפון חייב להכיל 10 ספרות ולהתחיל ב-05"),
  email: z.string().email("כתובת אימייל לא תקינה").optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [success, setSuccess] = useState(false);
  const registerMutation = useRegisterMember();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      birthDate: "",
      notes: "",
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data, {
      onSuccess: () => {
        setSuccess(true);
      },
    });
  };

  const handleReset = () => {
    form.reset();
    setSuccess(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-card rounded-2xl shadow-lg border border-border p-8 text-center animate-in fade-in zoom-in duration-500">
          <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold mb-2">איזה יופי!</h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            הלקוח נוסף בהצלחה למערכת. שלחנו לו כרגע הודעת וואטסאפ לאישור ההצטרפות למועדון.
          </p>
          
          <div className="bg-secondary/50 rounded-xl p-4 mb-8 text-right">
            <div className="flex items-center gap-3 mb-2 text-primary font-medium">
              <MessageCircle className="w-5 h-5" />
              <span>מה קורה עכשיו?</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-2 pr-8 list-disc">
              <li>הלקוח יקבל הודעה לנייד ששמנו</li>
              <li>עליו לאשר את ההצטרפות בלחיצת כפתור</li>
              <li>לאחר האישור, הוא יהפוך לחבר מועדון פעיל!</li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleReset}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              הוסף לקוח נוסף
            </button>
            <Link href="/admin" className="w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center">
              מעבר לפאנל ניהול
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <div className="bg-primary text-primary-foreground py-12 px-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent" />
        <div className="max-w-md mx-auto relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-6 shadow-xl">
            <Gift className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-3 tracking-tight">הצטרפות למועדון</h1>
          <p className="text-primary-foreground/80 text-lg">
            הזינו את פרטי הלקוח כדי לצרף אותו למועדון שלנו
          </p>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex-1 px-4 pb-12 -mt-6">
        <div className="max-w-md mx-auto bg-card rounded-2xl shadow-xl border border-border p-6 sm:p-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                שם מלא <span className="text-destructive">*</span>
              </label>
              <input
                {...form.register("fullName")}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="לדוגמה: ישראל ישראלי"
                disabled={registerMutation.isPending}
              />
              {form.formState.errors.fullName && (
                <p className="text-destructive text-sm mt-1.5">{form.formState.errors.fullName.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                מספר טלפון <span className="text-destructive">*</span>
              </label>
              <input
                {...form.register("phone")}
                dir="ltr"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-right"
                placeholder="050-0000000"
                disabled={registerMutation.isPending}
              />
              {form.formState.errors.phone && (
                <p className="text-destructive text-sm mt-1.5">{form.formState.errors.phone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                כתובת אימייל <span className="text-muted-foreground font-normal">(אופציונלי)</span>
              </label>
              <input
                {...form.register("email")}
                dir="ltr"
                type="email"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-right"
                placeholder="email@example.com"
                disabled={registerMutation.isPending}
              />
              {form.formState.errors.email && (
                <p className="text-destructive text-sm mt-1.5">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                תאריך לידה <span className="text-muted-foreground font-normal">(אופציונלי)</span>
              </label>
              <input
                {...form.register("birthDate")}
                type="date"
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                disabled={registerMutation.isPending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                הערות פנימיות <span className="text-muted-foreground font-normal">(אופציונלי)</span>
              </label>
              <textarea
                {...form.register("notes")}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
                placeholder="הערות שרק הצוות רואה..."
                disabled={registerMutation.isPending}
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 px-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
              >
                {registerMutation.isPending ? (
                  <>
                    <Loader2 className="w-6 h-6 animate-spin" />
                    רושם למערכת...
                  </>
                ) : (
                  "שלח הרשמה בוואטסאפ"
                )}
              </button>
            </div>
            
            {registerMutation.isError && (
              <p className="text-destructive text-sm text-center bg-destructive/10 p-3 rounded-lg">
                אירעה שגיאה בשמירת הלקוח. אנא נסו שנית.
              </p>
            )}

          </form>
        </div>
        
        <div className="mt-8 text-center">
          <Link href="/admin" className="text-muted-foreground hover:text-primary transition-colors text-sm font-medium">
            כניסה לאזור ניהול (לצוות בלבד)
          </Link>
        </div>
      </div>
    </div>
  );
}
