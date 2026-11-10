import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import SiteLayout from "./components/SiteLayout.jsx";
import WelcomePage from "./pages/WelcomePage.jsx";
import Welcome from "./pages/Welcome.jsx";
import SetupPage from "./pages/SetupPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import RestockPage from "./pages/RestockPage.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";
import SuccessPage from "./pages/SuccessPage.jsx";
import OrdersPage from "./pages/OrdersPage.jsx";
import ToolsPage from "./pages/ToolsPage.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import Login from "./Login.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import { useAuth } from "./useAuth.jsx";

function PageTransition({ children }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      className="page-transition"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(5px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(4px)" }}
      transition={{ duration: reduceMotion ? 0.15 : 0.35 }}
    >{children}</motion.div>
  );
}

function PlaceholderPage({ title }) {
  return <main className="content-panel"><p className="eyebrow">Brew2Basket</p><h1>{title}</h1><p>This page will be connected to your existing café data in a later step.</p></main>;
}

function LoginEntry() {
  const { user } = useAuth();
  if (!user) return <PageTransition><Login /></PageTransition>;
  const destination = window.localStorage.getItem("Brew2Basket:intro-seen") === "1" ? "/" : "/welcome";
  return <Navigate to={destination} replace />;
}

function protect(page) {
  return <ProtectedRoute><PageTransition>{page}</PageTransition></ProtectedRoute>;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<LoginEntry />} />
        <Route path="/welcome" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
        <Route path="/" element={protect(<WelcomePage />)} />
        <Route path="/setup" element={<ProtectedRoute><SetupPage /></ProtectedRoute>} />
        <Route path="/dashboard" element={protect(<DashboardPage />)} />
        <Route path="/restock" element={protect(<RestockPage />)} />
        <Route path="/checkout" element={protect(<CheckoutPage />)} />
        <Route path="/success" element={protect(<SuccessPage />)} />
        <Route path="/orders" element={protect(<OrdersPage />)} />
        <Route path="/tools" element={protect(<ToolsPage />)} />
        <Route path="/account" element={protect(<AccountPage />)} />
        <Route path="*" element={protect(<PlaceholderPage title="Page not found" />)} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return <SiteLayout><AnimatedRoutes /></SiteLayout>;
}

