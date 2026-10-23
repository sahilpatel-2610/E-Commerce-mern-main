import React from "react";
import { RiExchangeFundsFill, RiCustomerService2Fill, RiShieldCheckFill } from "react-icons/ri";
import { BiSolidCalendarCheck } from "react-icons/bi";

const policies = [
  {
    icon: <RiExchangeFundsFill className="text-3xl text-amber-400" />,
    title: "Easy Exchange Policy",
    desc: "Hassle-free size and product exchange on all orders.",
    badgeBg: "from-amber-500/20 to-yellow-500/10",
    borderGlow: "group-hover:border-amber-500/40",
  },
  {
    icon: <BiSolidCalendarCheck className="text-3xl text-emerald-400" />,
    title: "7 Days Return Policy",
    desc: "Easy 7-day return guarantee on eligible fashion apparel.",
    badgeBg: "from-emerald-500/20 to-teal-500/10",
    borderGlow: "group-hover:border-emerald-500/40",
  },
  {
    icon: <RiCustomerService2Fill className="text-3xl text-sky-400" />,
    title: "24/7 Dedicated Support",
    desc: "Expert customer assistance & sizing help whenever you need.",
    badgeBg: "from-sky-500/20 to-blue-500/10",
    borderGlow: "group-hover:border-sky-500/40",
  },
  {
    icon: <RiShieldCheckFill className="text-3xl text-purple-400" />,
    title: "100% Secure Checkout",
    desc: "Safe & encrypted payments with UPI, Cards & Cash on Delivery.",
    badgeBg: "from-purple-500/20 to-pink-500/10",
    borderGlow: "group-hover:border-purple-500/40",
  },
];

function OurPolicy() {
  return (
    <div className="py-14 select-none">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-7xl mx-auto px-4">
        {policies.map((item, index) => (
          <div
            key={index}
            className={`group bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 flex flex-col items-center text-center backdrop-blur-md transition-all duration-300 hover:bg-zinc-900/80 hover:-translate-y-1 shadow-lg ${item.borderGlow}`}
          >
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.badgeBg} border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-inner`}
            >
              {item.icon}
            </div>
            <h3 className="font-bold text-base text-white tracking-wide mb-1.5 group-hover:text-amber-300 transition-colors">
              {item.title}
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default OurPolicy;
