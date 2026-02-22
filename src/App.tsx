import { useState, useEffect } from "react";
import Intro from "./components/Intro";
import Auth from "./components/Auth";
import Chat from "./components/Chat";

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem("void_token"));
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("void_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleAuthSuccess = (newToken: string, newUser: any) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("void_token", newToken);
    localStorage.setItem("void_user", JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("void_token");
    localStorage.removeItem("void_user");
  };

  if (showIntro) {
    return <Intro onComplete={() => setShowIntro(false)} />;
  }

  if (!token) {
    return <Auth onSuccess={handleAuthSuccess} />;
  }

  return <Chat token={token} user={user} onLogout={handleLogout} />;
}
