import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./store/auth.jsx";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Home from "./pages/Home";
import NewEntry from "./pages/NewEntry";
import EntryList from "./pages/EntryList";
import Payroll from "./pages/Payroll";
import AdminCostCenters from "./pages/AdminCostCenters";
import AdminUsers from "./pages/AdminUsers";
import AdminEmployees from "./pages/AdminEmployees";
import AdminRegions from "./pages/AdminRegions";

export default function App() {
  return (
    <AuthProvider>
      <ToastContainer
        position="top-right"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss
        pauseOnHover
      />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/belepok/uj" element={<NewEntry />} />
            <Route path="/belepok/:id" element={<NewEntry />} />
            <Route path="/belepok/folyamatban" element={<EntryList />} />
            <Route path="/belepok/lezartak" element={<EntryList />} />
            <Route path="/berszamfejtes/feldolgozas" element={<Payroll />} />
            <Route path="/berszamfejtes/csv" element={<Payroll />} />
            <Route path="/berszamfejtes/elozmeny" element={<Payroll />} />
            <Route path="/admin/koltseghelyek" element={<AdminCostCenters />} />
            <Route path="/admin/felhasznalok" element={<AdminUsers />} />
            <Route path="/admin/munkavallalok" element={<AdminEmployees />} />
            <Route path="/admin/regio" element={<AdminRegions />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
