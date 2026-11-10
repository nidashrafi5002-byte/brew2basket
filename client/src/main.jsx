import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import SplashScreen from "./components/SplashScreen.jsx";
import "./styles.css";
import { CafeProvider } from "./context/CafeContext.jsx";
import { AuthProvider } from "./useAuth.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CafeProvider>
          <SplashScreen>
            <App />
          </SplashScreen>
        </CafeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);





