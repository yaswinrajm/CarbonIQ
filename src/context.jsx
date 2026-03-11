import React, { createContext, useContext, useState } from "react";

const AppContext = createContext();

export const useAppContext = () => useContext(AppContext);

const defaultCompany = {
  name: "",
  industry: "Technology",
  employees: "1-50",
  country: "United Kingdom",
  year: "2024",
};

const defaultEmissions = {
  scope1: 0,
  scope2: 0,
  scope3: 0,
  totalTonnes: 0,
  perEmployee: 0,
  industryAverage: 0,
  carbonScore: 0,
  grade: "N/A",
  biggestSource: null,
  byCategory: {
    energy: 0,
    transport: 0,
    waste: 0,
    water: 0,
  },
  monthly: [],
};

export const AppProvider = ({ children }) => {
  const [company, setCompany] = useState(defaultCompany);
  const [emissions, setEmissions] = useState(defaultEmissions);
  const [rawInput, setRawInput] = useState({});
  const [csvData, setCsvData] = useState(null);

  const value = {
    company,
    setCompany,
    emissions,
    setEmissions,
    rawInput,
    setRawInput,
    csvData,
    setCsvData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

