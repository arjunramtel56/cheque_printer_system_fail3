"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Forgot password?</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a reset link
          </CardDescription>
        </CardHeader>
        {submitted ? (
          <CardContent className="space-y-4 text-center">
            <div className="rounded-md bg-green-50 p-3 text-sm text-green-600">
              If an account exists with that email, you&apos;ll receive a password reset link shortly.
            </div>
            <Link href="/en/login">
              <Button variant="outline" className="w-full">Back to login</Button>
            </Link>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardContent className="flex flex-col space-y-4">
              <Button type="submit" className="w-full">Send reset link</Button>
              <Link href="/en/login">
                <Button variant="ghost" className="w-full">Back to login</Button>
              </Link>
            </CardContent>
          </form>
        )}
      </Card>
    </div>
  );
}
