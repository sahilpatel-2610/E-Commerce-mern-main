import React, { useEffect, useState } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Add from "./pages/Add";
import List from "./pages/List";
import ProductRams from "./pages/ProductRams";
import ProductWeights from "./pages/ProductWeights";
import ProductSizes from "./pages/ProductSizes";
import Categories from "./pages/Categories";
import AddCategory from "./pages/AddCategory";
import SubCategoryList from "./pages/SubCategoryList";
import AddSubCategory from "./pages/AddSubCategory";
import Orders from "./pages/Orders";
import Reviews from "./pages/Reviews";
import Users from "./pages/Users";
import Subscribers from "./pages/Subscribers";
import Banners from "./pages/Banners";
import AboutCMS from "./pages/AboutCMS";
import ContactCMS from "./pages/ContactCMS";
import Login from "./components/Login";
import { ToastContainer } from "react-toastify";

export const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
export const currency = "₹";

function App() {
  const [token, setToken] = useState(
    localStorage.getItem("token") ? localStorage.getItem("token") : ""
  );

  // Sidebar Open / Collapsed Toggle State
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    localStorage.setItem("token", token);
  }, [token]);

  return (
    <div className="bg-[#09090b] text-gray-200 h-screen overflow-hidden flex flex-col select-none">
      <ToastContainer
        position="bottom-right"
        autoClose={3500}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      {token === "" ? (
        <Login setToken={setToken} />
      ) : (
        <div className="flex flex-col h-screen overflow-hidden bg-[#09090b]">
          <Navbar
            setToken={setToken}
            sidebarOpen={sidebarOpen}
            setSidebarOpen={setSidebarOpen}
          />
          <div className="flex flex-1 overflow-hidden w-full bg-[#09090b]">
            {sidebarOpen && <Sidebar setToken={setToken} />}
            <main
              className={`flex-1 h-full overflow-y-auto px-4 sm:px-8 py-6 overflow-x-hidden bg-[#09090b] transition-all duration-300 ${
                sidebarOpen ? "max-w-7xl" : "w-full max-w-full"
              }`}
            >
              <Routes>
                <Route path="/" element={<Dashboard token={token} />} />
                <Route path="/dashboard" element={<Dashboard token={token} />} />
                <Route path="/users" element={<Users token={token} />} />
                <Route path="/list" element={<List token={token} />} />
                <Route path="/product-list" element={<List token={token} />} />
                <Route path="/add" element={<Add token={token} />} />
                <Route path="/product-upload" element={<Add token={token} />} />
                <Route path="/product-rams" element={<ProductRams token={token} />} />
                <Route path="/product-weights" element={<ProductWeights token={token} />} />
                <Route path="/product-sizes" element={<ProductSizes token={token} />} />
                <Route path="/categories" element={<Categories token={token} />} />
                <Route path="/category-list" element={<Categories token={token} />} />
                <Route path="/add-category" element={<AddCategory token={token} />} />
                <Route path="/sub-category-list" element={<SubCategoryList token={token} />} />
                <Route path="/add-sub-category" element={<AddSubCategory token={token} />} />
                <Route path="/orders" element={<Orders token={token} />} />
                <Route path="/reviews" element={<Reviews token={token} />} />
                <Route path="/subscribers" element={<Subscribers token={token} />} />
                <Route path="/banners" element={<Banners token={token} />} />
                <Route path="/about-cms" element={<AboutCMS token={token} />} />
                <Route path="/about-studio" element={<AboutCMS token={token} />} />
                <Route path="/contact-cms" element={<ContactCMS token={token} />} />
                <Route path="/contact-studio" element={<ContactCMS token={token} />} />
              </Routes>
            </main>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
