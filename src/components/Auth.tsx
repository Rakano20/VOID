import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

interface AuthProps {
  onSuccess: (token: string, user: any) => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const [view, setView] = useState<"login" | "signup" | "forgot" | "reset">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleGoogleLogin = async () => {
    try {
      const response = await fetch("/api/auth/google/url");
      const { url } = await response.json();
      const authWindow = window.open(url, "google_auth", "width=600,height=700");
      
      if (!authWindow) {
        setError("Popup blocked. Please allow popups.");
        return;
      }

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
          onSuccess(event.data.token, event.data.user);
          window.removeEventListener("message", handleMessage);
        }
      };
      window.addEventListener("message", handleMessage);
    } catch (err) {
      setError("Failed to initiate Google login");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      if (view === "login") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (res.ok) onSuccess(data.token, data.user);
        else setError(data.error || "Login failed");
      } else if (view === "signup") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password, securityQuestion, securityAnswer }),
        });
        const data = await res.json();
        if (res.ok) onSuccess(data.token, data.user);
        else setError(data.error || "Signup failed");
      } else if (view === "forgot") {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        const data = await res.json();
        if (res.ok) {
          setSecurityQuestion(data.securityQuestion);
          setView("reset");
        } else {
          setError(data.error || "User not found");
        }
      } else if (view === "reset") {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, securityAnswer, newPassword }),
        });
        const data = await res.json();
        if (res.ok) {
          setSuccessMessage("Password reset! You can now login.");
          setView("login");
          setPassword("");
        } else {
          setError(data.error || "Reset failed");
        }
      }
    } catch (err) {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const QUESTIONS = [
    "What was the name of your first pet?",
    "What city were you born in?",
    "What is your mother's maiden name?",
    "What was your first car?",
    "What is your favorite book?",
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-black">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
      >
        <source src="https://assets.mixkit.co/videos/preview/mixkit-abstract-flowing-dark-particles-26031-large.mp4" type="video/mp4" />
      </video>

      <div className="atmosphere absolute inset-0 pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass p-8 rounded-3xl relative z-10"
      >
        <div className="mb-8 text-center">
          <h2 className="text-4xl font-serif italic mb-2">
            {view === "login" && "Welcome"}
            {view === "signup" && "Join Us"}
            {view === "forgot" && "Recovery"}
            {view === "reset" && "Reset"}
          </h2>
          <p className="text-white/40 text-sm font-mono uppercase tracking-widest">
            {view === "login" && "Enter the Void"}
            {view === "signup" && "Create your identity"}
            {view === "forgot" && "Locate your essence"}
            {view === "reset" && "Define a new path"}
          </p>
        </div>

        {successMessage && (
          <div className="mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs text-center">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {(view === "login" || view === "signup" || view === "forgot") && (
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2 ml-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                required
              />
            </div>
          )}

          {(view === "login" || view === "signup") && (
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2 ml-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                required
              />
            </div>
          )}

          {view === "signup" && (
            <>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2 ml-1">Security Question</label>
                <select
                  value={securityQuestion}
                  onChange={(e) => setSecurityQuestion(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 transition-colors text-white/80"
                  required
                >
                  <option value="" disabled className="bg-black">Select a question</option>
                  {QUESTIONS.map(q => (
                    <option key={q} value={q} className="bg-black">{q}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2 ml-1">Security Answer</label>
                <input
                  type="text"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                  required
                />
              </div>
            </>
          )}

          {view === "reset" && (
            <>
              <div className="p-4 bg-white/5 rounded-xl border border-white/10 mb-4">
                <p className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Question</p>
                <p className="text-sm italic font-serif">{securityQuestion}</p>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2 ml-1">Your Answer</label>
                <input
                  type="text"
                  value={securityAnswer}
                  onChange={(e) => setSecurityAnswer(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-white/40 mb-2 ml-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                  required
                />
              </div>
            </>
          )}

          {error && <p className="text-red-400 text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-medium py-3 rounded-xl hover:bg-white/90 transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? "Processing..." : 
              view === "login" ? "Login" : 
              view === "signup" ? "Sign Up" : 
              view === "forgot" ? "Find Account" : "Reset Password"}
          </button>

          {view === "login" && (
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                <span className="bg-[#050505] px-4 text-white/20">Or continue with</span>
              </div>
            </div>
          )}

          {view === "login" && (
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full bg-white/5 border border-white/10 text-white font-medium py-3 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
          )}
        </form>

        <div className="mt-6 flex flex-col gap-3 text-center">
          {view === "login" ? (
            <>
              <button
                onClick={() => setView("signup")}
                className="text-xs text-white/40 hover:text-white transition-colors"
              >
                Need an account? Sign up
              </button>
              <button
                onClick={() => setView("forgot")}
                className="text-[10px] uppercase tracking-widest text-white/20 hover:text-white/40 transition-colors"
              >
                Forgot Password?
              </button>
            </>
          ) : (
            <button
              onClick={() => setView("login")}
              className="text-xs text-white/40 hover:text-white transition-colors"
            >
              Back to Login
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
