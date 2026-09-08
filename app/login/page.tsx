import type { Metadata } from "next";
import LoginForm from "./login-form";

export const metadata: Metadata = { title: "دخول | حبّنا" };

export default function LoginPage() {
  return <LoginForm />;
}
