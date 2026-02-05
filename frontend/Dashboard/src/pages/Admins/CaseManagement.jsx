// src/pages/admin/CaseManagement.jsx (or your current path)
import React, { useEffect, useState } from "react";
import {
  App as AntApp,
  Card,
  Table,
  Typography,
  Tag,
  Layout,
  Button,
  Input,
  Select,
  Space,
  Tooltip,
  Modal,
  Form,
  Grid,
  Row,
  Col,
  Divider,
  DatePicker,
  Checkbox,
  Tabs,
  Radio,
  Statistic,
} from "antd";
import {
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MenuOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  FormOutlined,
  CloseCircleOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  CheckSquareOutlined,
  FolderOpenOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  EnvironmentOutlined,
  FireOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { api, getUserType } from "../../lib/api";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

export default function CaseManagement() {
  const { message } = AntApp.useApp();
  const screens = Grid.useBreakpoint();
  const isXs = !!screens.xs && !screens.sm;
  const isMdUp = !!screens.md;
  const [loading, setLoading] = useState(true);
  const [allCases, setAllCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [filterType, setFilterType] =   useState("all");
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [isViewMode, setIsViewMode] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [reportsList, setReportsList] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [userType, setUserType] = useState(null);
  const [currentUserName, setCurrentUserName] = useState("");
  const [addSubtypeOptions, setAddSubtypeOptions] = useState([]); // Track subtypes for add modal
  const [editSubtypeOptions, setEditSubtypeOptions] = useState([]); // Track subtypes for edit modal
  const [keywordMappings, setKeywordMappings] = useState({}); // Keyword mappings from API
  
  // Analytics/Insights state
  const [analyticsData, setAnalyticsData] = useState({
    totalCases: 0,
    openCases: 0,
    resolvedCases: 0,
    highRiskCases: 0,
    mostCommonIncident: "",
    mostCommonLocation: ""
  });
  
  // Delete confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState(null);
  
  // Combined Export modal
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportType, setExportType] = useState("csv"); // "csv" or "pdf"
  const [exportMode, setExportMode] = useState("all"); // "all", "officer" or "victim"
  const [selectedOfficer, setSelectedOfficer] = useState("");
  const [selectedVictim, setSelectedVictim] = useState("");
  const [exportFilters, setExportFilters] = useState({
    purok: "",
    status: "",
    riskLevel: "",
    incidentType: "",
    subtype: "",
    victimType: "",
    year: "",
    month: "",
    week: ""
  });
  const [selectedCases, setSelectedCases] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [barangayOfficials, setBarangayOfficials] = useState([]);
  
  const [form] = Form.useForm();
  const [addForm] = Form.useForm();
  const navigate = useNavigate();

  const BRAND = {
    violet: "#7A5AF8",
    pink: "#e91e63",
    bg: "linear-gradient(180deg, #ffffff 0%, #faf7ff 60%, #f6f3ff 100%)",
    soft: "rgba(122,90,248,0.18)",
    chip: "#fff0f7",
  };

  // Calculate age from birthdate
  const calculateAge = (birthdate) => {
    if (!birthdate) return null;
    
    const today = dayjs();
    const birth = dayjs(birthdate);
    
    if (!birth.isValid()) return null;
    
    // Calculate age using year subtraction
    let age = today.year() - birth.year();
    
    // Check if birthday has occurred this year
    const birthdayThisYear = birth.set('year', today.year());
    if (today.isBefore(birthdayThisYear)) {
      age--;
    }
    
    return age < 0 ? null : age;
  };

  const generateCaseID = () => {
    const r = Math.floor(100 + Math.random() * 900);
    addForm.setFieldsValue({ caseID: `CASE${r}` });
  };

  const fetchAllCases = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/api/cases");
      if (data) {
        const formatted = (data.data || []).map((c) => ({
          key: c.caseID,
          caseID: c.caseID,
          reportID: c.reportID,
          victimID: c.victimID,
          victimName: c.victimName,
          victimType: c.victimType,
          incidentType: c.incidentType,
          incidentSubtype: c.incidentSubtype,
          description: c.description,
          perpetrator: c.perpetrator,
          location: c.location,
          dateReported: c.dateReported,
          status: c.status,
          assignedOfficer: c.assignedOfficer,
          riskLevel: c.riskLevel,
          createdAt: c.createdAt,
        }));
        // Sort by createdAt in descending order (most recent first)
        formatted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setAllCases(formatted);
        setFilteredCases(formatted);
      }
    } catch (err) {
      console.error("Error fetching cases", err);
      message.error("Failed to load cases");
    } finally {
      setLoading(false);
    }
  };

  const fetchBarangayOfficials = async () => {
    try {
      const { data } = await api.get("/api/admin/users");
      if (data.success && data.data.officials) {
        const officials = data.data.officials.map((o) => ({
          id: o._id,
          name: `${o.firstName} ${o.middleInitial ? o.middleInitial + " " : ""}${o.lastName}`,
          firstName: o.firstName,
          middleInitial: o.middleInitial,
          lastName: o.lastName,
          position: o.position,
          status: o.status,
        }));
        setBarangayOfficials(officials);
      }
    } catch (err) {
      console.error("Error fetching barangay officials", err);
    }
  };

  const fetchKeywordMappings = async () => {
    try {
      const { data } = await api.get("/api/metadata/keyword-mappings");
      if (data?.data) {
        setKeywordMappings(data.data);
      }
    } catch (err) {
      console.error("Error fetching keyword mappings", err);
    }
  };

  const detectSubtypeFromDescription = (description, incidentType) => {
    if (!description || !incidentType || Object.keys(keywordMappings).length === 0) {
      return "Uncategorized";
    }

    // Extract base incident type (handle "Others: CustomText" format)
    let baseIncidentType = incidentType;
    let customOthersText = "";
    
    if (incidentType.includes(":")) {
      const parts = incidentType.split(":");
      baseIncidentType = parts[0].trim();
      customOthersText = parts.slice(1).join(":").trim();
    }

    const descLower = description.toLowerCase();
    // Combine description with custom text for keyword matching
    const searchText = customOthersText 
      ? `${descLower} ${customOthersText.toLowerCase()}` 
      : descLower;

    // Check each potential subtype for keywords
    for (const subtype in keywordMappings) {
      const keywords = keywordMappings[subtype];
      if (!keywords) continue;

      // Check English keywords
      if (keywords.english) {
        for (const keyword of keywords.english) {
          if (searchText.includes(keyword.toLowerCase())) {
            return subtype;
          }
        }
      }

      // Check Tagalog/Filipino keywords
      if (keywords.tagalog) {
        for (const keyword of keywords.tagalog) {
          if (searchText.includes(keyword.toLowerCase())) {
            return subtype;
          }
        }
      }
    }

    return "Uncategorized";
  };

  const getSubtypesForIncident = (incidentType) => {
    // Extract base incident type (handle "Others: CustomText" format)
    let baseIncidentType = incidentType;
    if (incidentType && incidentType.includes(":")) {
      baseIncidentType = incidentType.split(":")[0].trim();
    }

    // Hardcoded mapping for subtypes per incident type
    const subtypesMapping = {
      Physical: ["Slapping", "Hitting", "Strangulation", "Threat with weapon", "Uncategorized"],
      Sexual: ["Rape", "Attempted rape", "Molestation", "Coercion", "Uncategorized"],
      Psychological: ["Verbal abuse", "Gaslighting", "Threats", "Stalking", "Uncategorized"],
      Economic: ["Withholding support", "Employment restriction", "Financial manipulation", "Uncategorized"],
      Others: ["Cyber harassment", "Theft involving minors", "Uncategorized"],
    };
    return subtypesMapping[baseIncidentType] || ["Uncategorized"];
  };

  useEffect(() => {
    fetchAllCases();
    fetchBarangayOfficials();
    fetchKeywordMappings();
    
    const fetchUserType = async () => {
      try {
        const type = await getUserType();
        setUserType(type);
      } catch (err) {
        console.error("Failed to get user type", err);
        setUserType("user"); // fallback
      }
    };
    
    const fetchCurrentUser = async () => {
      try {
        const response = await api.get('/api/auth/me');
        const userName = response.data?.user?.name || response.data?.user?.email || "Unknown User";
        setCurrentUserName(userName);
      } catch (err) {
        console.warn("Failed to fetch current user", err);
        setCurrentUserName("Unknown User");
      }
    };
    
    fetchUserType();
    fetchCurrentUser();
  }, []);

  const fetchReports = async () => {
    try {
      const { data } = await api.get("/api/reports");
      const raw = data?.data ?? data ?? [];
      const arr = Array.isArray(raw) ? raw : (raw || []);
      if (arr.length) {
        const formatted = arr.map((r) => {
          let victim = null;
          if (r.victimID) {
            const { location, ...victimNoLocation } = r.victimID;
            victim = victimNoLocation;
          }
          return {
            key: r.reportID,
            reportID: r.reportID,
            victim,
            incidentType: r.incidentType,
            description: r.description,
            perpetrator: r.perpetrator,
            location: r.location,
            dateReported: r.dateReported,
            status: r.status,
            createdAt: r.createdAt,
            raw: r,
          };
        });
        setReportsList(formatted);
      } else {
        setReportsList([]);
      }
    } catch (err) {
      console.error("Failed to fetch reports", err);
    }
  };

  const handleViewCase = (rec) => {
    const base = userType === "official" ? "/admin/official-cases" : "/admin/cases";
    navigate(`${base}/${rec.caseID}`);
  };

  const handleEditCase = (rec) => {
    const base = userType === "official" ? "/admin/official-cases" : "/admin/cases";
    navigate(`${base}/${rec.caseID}?edit=true`);
  };

  const openAddModal = async () => {
    setAddModalVisible(true);
    setSelectedReport(null);
    addForm.resetFields();
    // ensure status defaults to Open for new cases
    addForm.setFieldsValue({ status: 'Open' });
    // Initialize with Physical abuse subtypes as default, but leave incidentSubtype empty
    const defaultSubtypes = getSubtypesForIncident('Physical');
    setAddSubtypeOptions(defaultSubtypes);
    await fetchReports();
    await fetchBarangayOfficials();
  };

  const handleReportSelect = (reportID) => {
    const rep = reportsList.find((r) => r.reportID === reportID);
    setSelectedReport(rep || null);
    if (rep) {
      const nameParts = [];
      if (rep.victim) {
        if (rep.victim.firstName) nameParts.push(rep.victim.firstName);
        if (rep.victim.middleInitial) nameParts.push(rep.victim.middleInitial);
        if (rep.victim.lastName) nameParts.push(rep.victim.lastName);
      }
      const composedName = nameParts.length
        ? nameParts.join(" ").trim()
        : rep.victim?.victimID || "";

      const dateReportedDayjs = rep.dateReported ? dayjs(rep.dateReported) : null;

      // Parse location into purok and address components
      let locationPurok = "";
      const location = rep.location || "";
      if (location.startsWith("Purok")) {
        const parts = location.split(", ");
        locationPurok = parts[0]; // e.g., "Purok 1"
      }

      // Update subtypes based on the selected report's incident type
      const subtypes = getSubtypesForIncident(rep.incidentType);
      setAddSubtypeOptions(subtypes);
      
      // Detect subtype from description
      const detectedSubtype = detectSubtypeFromDescription(rep.description, rep.incidentType);
      
      addForm.setFieldsValue({
        reportID: rep.reportID,
        incidentType: rep.incidentType,
        incidentSubtype: detectedSubtype,
        description: rep.description,
        perpetrator: rep.perpetrator || "",
        locationPurok: locationPurok,
        locationAddress: "Bonfal Proper, Bayombong, Nueva Vizcaya",
        location: rep.location || "",
        victimName: composedName,
        victimType: rep.victim?.victimType || "anonymous",
        dateReported: dateReportedDayjs,
        riskLevel: (function (it) {
          if (!it) return "Low";
          const l = String(it).toLowerCase();
          if (l.includes("emerg")) return undefined;
          if (l.includes("economic") || l.includes("financial")) return "Low";
          if (l.includes("psych")) return "Medium";
          if (l.includes("physical")) return "High";
          if (l.includes("sexual")) return "High";
          return "Low";
        })(rep.incidentType),
      });
    }
  };

  const handleCreateCase = async (vals) => {
    try {
      setLoading(true);
      
      // Convert dateReported from dayjs to ISO string if it exists
      const dateReportedValue = vals.dateReported 
        ? vals.dateReported.toISOString() 
        : new Date().toISOString();
      
      // Combine location fields: if purok selected, prepend to default address
      const location = vals.locationPurok
        ? `${vals.locationPurok}, Bonfal Proper, Bayombong, Nueva Vizcaya`
        : "Bonfal Proper, Bayombong, Nueva Vizcaya";
      
      // Get officer name from ID - convert ID to name
      const assignedOfficerId = vals.assignedOfficer;
      const selectedOfficer = barangayOfficials.find(o => o.id === assignedOfficerId);
      const assignedOfficerName = selectedOfficer ? selectedOfficer.name : "";
      
      let payload;
      if (selectedReport) {
        payload = {
          caseID: vals.caseID,
          reportID: selectedReport.reportID,
          victimID: selectedReport.raw.victimID?._id || selectedReport.raw.victimID || null,
          victimName:
            vals.victimName ||
            (selectedReport.victim
              ? `${selectedReport.victim.firstName || ""} ${selectedReport.victim.middleInitial ? selectedReport.victim.middleInitial + " " : ""
                }${selectedReport.victim.lastName || ""}`.trim()
              : selectedReport.raw.victimID || ""),
          incidentType: selectedReport.incidentType,
          incidentSubtype: vals.incidentSubtype || "Uncategorized",
          description: selectedReport.description,
          perpetrator: selectedReport.perpetrator || "",
          location: location,
          dateReported: selectedReport.dateReported || dateReportedValue,
          status: vals.status || "Open",
          assignedOfficer: assignedOfficerName,
          riskLevel:
            typeof vals.riskLevel === "undefined" ? undefined : vals.riskLevel || "Low",
          victimType: vals.victimType || selectedReport.victim?.victimType || "anonymous",
          ...(vals.victimBirthdate ? { victimBirthdate: vals.victimBirthdate.toISOString() } : {}),
          ...(vals.victimAge ? { victimAge: vals.victimAge } : {}),
          ...(vals.victimGender ? { victimGender: vals.victimGender } : {}),
        };
      } else {
        payload = {
          caseID: vals.caseID,
          reportID: vals.reportID || null,
          victimID: vals.victimID || null,
          victimName: vals.victimName,
          incidentType: vals.incidentType,
          incidentSubtype: vals.incidentSubtype || "Uncategorized",
          description: vals.description,
          perpetrator: vals.perpetrator || "",
          location: location,
          dateReported: dateReportedValue,
          status: vals.status || "Open",
          assignedOfficer: assignedOfficerName,
          riskLevel:
            typeof vals.riskLevel === "undefined" ? undefined : vals.riskLevel || "Low",
          victimType: vals.victimType || "anonymous",
          ...(vals.victimBirthdate ? { victimBirthdate: vals.victimBirthdate.toISOString() } : {}),
          ...(vals.victimAge ? { victimAge: vals.victimAge } : {}),
          ...(vals.victimGender ? { victimGender: vals.victimGender } : {}),
        };
      }

      const res = await api.post("/api/cases", payload);
      if (res?.data?.success) {
        message.success("Case created");
        setAddModalVisible(false);
        addForm.resetFields();
        fetchAllCases();
      } else {
        message.error(res?.data?.message || "Failed to create case");
      }
    } catch (err) {
      console.error("Create case error", err.response || err);
      const resp = err?.response?.data;
      if (resp) {
        if (resp.message && String(resp.message).toLowerCase().includes("duplicate")) {
          addForm.setFields([
            { name: "caseID", errors: ["Please enter a different Case ID as it was already used"] },
          ]);
          message.error("Please enter a different Case ID as it was already used");
        } else if (resp.errors && typeof resp.errors === "object") {
          const fields = Object.keys(resp.errors).map((k) => ({
            name: k,
            errors: [resp.errors[k]],
          }));
          try {
            addForm.setFields(fields);
          } catch { }
          message.error(resp.message || "Validation failed");
        } else {
          message.error(resp.message || "Failed to create case");
        }
      } else {
        message.error("Failed to create case");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCase = async (rec) => {
    if (!rec) return;
    try {
      setLoading(true);
      const id = rec.caseID || rec._id;
      const res = await api.delete(`/api/cases/${id}`);
      if (res?.data?.success) {
        message.success("Case deleted");
        setDeleteModalOpen(false);
        setCaseToDelete(null);
      } else {
        message.error(res?.data?.message || "Delete failed");
      }
      fetchAllCases();
    } catch (err) {
      console.error("Delete failed", err.response || err);
      message.error(err.response?.data?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const showDeleteConfirm = (rec) => {
    setCaseToDelete(rec);
    setDeleteModalOpen(true);
  };

  const handleUpdateCase = async (vals) => {
    if (!editingCase) {
      message.error("No case selected for update");
      return;
    }
    try {
      setLoading(true);
      const id = editingCase.caseID || editingCase._id;
      // Combine location fields: if purok selected, prepend to default address
      const location = vals.locationPurok
        ? `${vals.locationPurok}, Bonfal Proper, Bayombong, Nueva Vizcaya`
        : "Bonfal Proper, Bayombong, Nueva Vizcaya";
      
      // Get officer name from ID - convert ID to name
      const assignedOfficerId = vals.assignedOfficer;
      const selectedOfficer = barangayOfficials.find(o => o.id === assignedOfficerId);
      const assignedOfficerName = selectedOfficer ? selectedOfficer.name : vals.assignedOfficer;
      
      const payload = {
        ...vals,
        location: location,
        perpetrator: vals.perpetrator || "",
        victimName: vals.victimName || editingCase.victimName || "",
        assignedOfficer: assignedOfficerName,
      };
      const res = await api.put(`/api/cases/${id}`, payload);
      if (res?.data?.success) {
        message.success("Case updated");
        setEditModalVisible(false);
        setEditingCase(null);
      } else {
        message.error(res?.data?.message || "Failed to update case");
      }
      fetchAllCases();
    } catch (err) {
      console.error("Update failed", err.response || err);
      message.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let f = allCases;
    if (filterType !== "all") f = f.filter((c) => c.status === filterType);
    if (searchText) {
      const s = searchText.toLowerCase();
      f = f.filter(
        (c) =>
          c.caseID?.toLowerCase().includes(s) ||
          c.incidentType?.toLowerCase().includes(s) ||
          c.assignedOfficer?.toLowerCase().includes(s)
      );
    }
    // Sort by createdAt in descending order (most recent first)
    f.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setFilteredCases(f);
    
    // Calculate analytics data whenever cases change
    calculateAnalytics(allCases);
  }, [allCases, searchText, filterType]);
  
  const calculateAnalytics = (cases) => {
    const totalCases = cases.length;
    const openCases = cases.filter(c => c.status?.toLowerCase() === "open").length;
    const resolvedCases = cases.filter(c => c.status?.toLowerCase() === "resolved").length;
    const highRiskCases = cases.filter(c => c.riskLevel?.toLowerCase() === "high").length;
    
    // Find most common incident type
    const incidentCounts = {};
    cases.forEach(c => {
      if (c.incidentType) {
        incidentCounts[c.incidentType] = (incidentCounts[c.incidentType] || 0) + 1;
      }
    });
    const mostCommonIncident = Object.keys(incidentCounts).length > 0
      ? Object.keys(incidentCounts).reduce((a, b) => 
          incidentCounts[a] > incidentCounts[b] ? a : b
        )
      : "N/A";
    
    // Find most common location (purok)
    const locationCounts = {};
    cases.forEach(c => {
      if (c.location) {
        const match = c.location.match(/purok\s*(\d+[a-zA-Z]?)/i);
        if (match) {
          const purok = `Purok ${match[1]}`;
          locationCounts[purok] = (locationCounts[purok] || 0) + 1;
        }
      }
    });
    const mostCommonLocation = Object.keys(locationCounts).length > 0
      ? Object.keys(locationCounts).reduce((a, b) => 
          locationCounts[a] > locationCounts[b] ? a : b
        )
      : "N/A";
    
    setAnalyticsData({
      totalCases,
      openCases,
      resolvedCases,
      highRiskCases,
      mostCommonIncident,
      mostCommonLocation
    });
  };

  const statusColor = (s) => {
    const v = String(s || "").toLowerCase();
    if (v.includes("open")) return "orange";
    if (v.includes("investigation") || v.includes("progress")) return "geekblue";
    if (v.includes("resolved")) return "green";
    if (v.includes("cancel")) return "default";
    return "default";
  };
  const riskColor = (r) => {
    const v = String(r || "").toLowerCase();
    if (v.includes("high")) return "magenta";
    if (v.includes("medium")) return "volcano";
    if (v.includes("low")) return "gold";
    return "default";
  };

  // Get unique officers from all cases
  const getUniqueOfficers = () => {
    const officers = allCases
      .map(c => c.assignedOfficer)
      .filter(o => o && o.trim() !== "");
    return [...new Set(officers)].sort();
  };

  // Get unique victims from all cases (optionally filtered by officer)
  const getUniqueVictims = (officerName = null) => {
    let casesToFilter = allCases;
    
    // If officer is selected, only get victims from that officer's cases
    if (officerName) {
      casesToFilter = allCases.filter(
        c => c.assignedOfficer && c.assignedOfficer.toLowerCase() === officerName.toLowerCase()
      );
    }
    
    const victims = casesToFilter
      .map(c => ({
        id: c.victimID,
        name: c.victimName || 'Unknown'
      }))
      .filter(v => v.name && v.name.trim() !== '' && v.name !== 'Unknown');
    
    // Remove duplicates based on victim name
    const uniqueMap = new Map();
    victims.forEach(v => {
      const key = v.name.toLowerCase().trim();
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, v);
      }
    });
    
    return Array.from(uniqueMap.values()).sort((a, b) => 
      a.name.localeCompare(b.name)
    );
  };

  // Get unique puroks from all cases (extracted from location)
  const getUniquePuroks = () => {
    const puroks = allCases
      .map(c => {
        if (!c.location) return null;
        // Try to extract Purok from location string (e.g., "Purok 1", "Purok 2, Barangay X")
        const match = c.location.match(/purok\s*(\d+[a-zA-Z]?)/i);
        return match ? `Purok ${match[1]}` : null;
      })
      .filter(p => p !== null);
    return [...new Set(puroks)].sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0]);
      const numB = parseInt(b.match(/\d+/)[0]);
      return numA - numB;
    });
  };

  // Helper function to create formatted Excel file using ExcelJS
  const createExcelFile = async (data, filename, includeRemarks = false, filterInfo = {}) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Cases");

    let currentRow = 1;

    // Add title
    const titleRow = worksheet.addRow(["CASES EXPORT SUMMARY"]);
    titleRow.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
    titleRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF7A5AF8" }
    };
    titleRow.alignment = { horizontal: "left", vertical: "top", wrapText: true };
    titleRow.height = 35;
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    currentRow++;

    // Calculate statistics for display
    const lowRiskCount = data.filter(c => c.riskLevel?.toLowerCase() === "low").length;
    const mediumRiskCount = data.filter(c => c.riskLevel?.toLowerCase() === "medium").length;
    const highRiskCount = data.filter(c => c.riskLevel?.toLowerCase() === "high").length;

    // Calculate status breakdown
    const statuses = {};
    data.forEach(c => {
      const status = c.status || "Unknown";
      statuses[status] = (statuses[status] || 0) + 1;
    });

    // Calculate incident type breakdown
    const incidentTypes = {};
    data.forEach(c => {
      const type = c.incidentType || "Unknown";
      incidentTypes[type] = (incidentTypes[type] || 0) + 1;
    });

    // Calculate incident subtype breakdown
    const incidentSubtypes = {};
    data.forEach(c => {
      const subtype = c.incidentSubtype || "Uncategorized";
      incidentSubtypes[subtype] = (incidentSubtypes[subtype] || 0) + 1;
    });

    // Calculate purok breakdown - extract purok number from location format
    const puroks = {};
    data.forEach(c => {
      let purokName = "Unknown";
      
      // Extract purok from location (format: "Purok X, ...")
      if (c.location) {
        const purokMatch = c.location.match(/Purok\s+\d+/);
        if (purokMatch) {
          purokName = purokMatch[0];
        } else {
          purokName = c.location;
        }
      } else if (c.purok) {
        purokName = c.purok;
      }
      
      puroks[purokName] = (puroks[purokName] || 0) + 1;
    });

    // Add timestamp and export mode
    const metaRow = worksheet.addRow([`Generated: ${new Date().toLocaleString()}`, "", `Export Mode: ${filterInfo.mode || "All Cases"}`, "", ""]);
    metaRow.font = { size: 11 };
    metaRow.alignment = { horizontal: "left", vertical: "top", wrapText: true };
    metaRow.height = 30;
    metaRow.getCell(1).alignment = { horizontal: "left", vertical: "top", wrapText: true };
    metaRow.getCell(3).alignment = { horizontal: "left", vertical: "top", wrapText: true };
    currentRow++;

    // Add export statistics row
    const statsRow = worksheet.addRow([`Total Cases: ${data.length}`, `Low: ${lowRiskCount}`, `Medium: ${mediumRiskCount}`, `High: ${highRiskCount}`, ""]);
    statsRow.font = { size: 11 };
    statsRow.alignment = { horizontal: "left", vertical: "top", wrapText: true };
    statsRow.height = 24;
    statsRow.getCell(1).font = { bold: true, size: 11 };
    statsRow.getCell(2).font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    statsRow.getCell(2).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF00B050" } };
    statsRow.getCell(3).font = { bold: true, size: 11 };
    statsRow.getCell(3).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFC000" } };
    statsRow.getCell(4).font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    statsRow.getCell(4).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF0000" } };
    currentRow++;

    // Add status breakdown row
    const statusBreakdown = Object.entries(statuses).map(([status, count]) => `${status}: ${count}`).join("\n");
    const statusRow = worksheet.addRow(["Status Breakdown", statusBreakdown, "", "", ""]);
    statusRow.font = { size: 10 };
    statusRow.alignment = { horizontal: "left", vertical: "top", wrapText: true };
    statusRow.height = Math.max(Object.keys(statuses).length * 18, 28);
    statusRow.getCell(1).font = { bold: true, size: 10, color: { argb: "FF7A5AF8" } };
    statusRow.getCell(2).alignment = { horizontal: "left", vertical: "top", wrapText: true };
    worksheet.mergeCells(`B${currentRow}:C${currentRow}`);
    currentRow++;

    // Add incident type breakdown row - sorted by: Sexual, Physical, Psychological, Economic, Others
    const incidentTypeOrder = { "sexual": 1, "physical": 2, "psychological": 3, "economic": 4 };
    const sortedIncidentTypes = Object.entries(incidentTypes).sort(([a], [b]) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const aIsOthers = aLower.startsWith("others");
      const bIsOthers = bLower.startsWith("others");
      
      if (aIsOthers && !bIsOthers) return 1;
      if (!aIsOthers && bIsOthers) return -1;
      
      const aOrder = incidentTypeOrder[aLower] || 999;
      const bOrder = incidentTypeOrder[bLower] || 999;
      return aOrder - bOrder;
    });
    const incidentTypeBreakdown = sortedIncidentTypes.map(([type, count]) => `${type}: ${count}`).join("\n");
    const incidentTypeRow = worksheet.addRow(["Incident Type Breakdown", incidentTypeBreakdown, "", "", ""]);
    incidentTypeRow.font = { size: 10 };
    incidentTypeRow.alignment = { horizontal: "left", vertical: "top", wrapText: true };
    incidentTypeRow.height = Math.max(Object.keys(incidentTypes).length * 18, 28);
    incidentTypeRow.getCell(1).font = { bold: true, size: 10, color: { argb: "FF7A5AF8" } };
    incidentTypeRow.getCell(2).alignment = { horizontal: "left", vertical: "top", wrapText: true };
    worksheet.mergeCells(`B${currentRow}:C${currentRow}`);
    currentRow++;

    // Add incident subtype breakdown row - sorted alphabetically, with "Others" at the end
    const sortedSubtypes = Object.entries(incidentSubtypes).sort(([a], [b]) => {
      const aIsOthers = a.toLowerCase().startsWith("others");
      const bIsOthers = b.toLowerCase().startsWith("others");
      if (aIsOthers && !bIsOthers) return 1;
      if (!aIsOthers && bIsOthers) return -1;
      return a.localeCompare(b);
    });
    const incidentSubtypeBreakdown = sortedSubtypes.map(([subtype, count]) => `${subtype}: ${count}`).join("\n");
    const incidentSubtypeRow = worksheet.addRow(["Incident Subtype Breakdown", incidentSubtypeBreakdown, "", "", ""]);
    incidentSubtypeRow.font = { size: 10 };
    incidentSubtypeRow.alignment = { horizontal: "left", vertical: "top", wrapText: true };
    incidentSubtypeRow.height = Math.max(Object.keys(incidentSubtypes).length * 18, 28);
    incidentSubtypeRow.getCell(1).font = { bold: true, size: 10, color: { argb: "FF7A5AF8" } };
    incidentSubtypeRow.getCell(2).alignment = { horizontal: "left", vertical: "top", wrapText: true };
    worksheet.mergeCells(`B${currentRow}:C${currentRow}`);
    currentRow++;

    // Add purok breakdown row - sorted numerically, with non-purok entries at the end
    const sortedPuroks = Object.entries(puroks).sort(([a], [b]) => {
      const aMatch = a.match(/\d+/);
      const bMatch = b.match(/\d+/);
      const aNum = aMatch ? parseInt(aMatch[0]) : Infinity;
      const bNum = bMatch ? parseInt(bMatch[0]) : Infinity;
      if (aNum === Infinity && bNum === Infinity) return a.localeCompare(b);
      return aNum - bNum;
    });
    const purokBreakdown = sortedPuroks.map(([purok, count]) => `${purok}: ${count}`).join("\n");
    const purokRow = worksheet.addRow(["Purok Breakdown", purokBreakdown, "", "", ""]);
    purokRow.font = { size: 10 };
    purokRow.alignment = { horizontal: "left", vertical: "top", wrapText: true };
    purokRow.height = Math.max(Object.keys(puroks).length * 18, 28);
    purokRow.getCell(1).font = { bold: true, size: 10, color: { argb: "FF7A5AF8" } };
    purokRow.getCell(2).alignment = { horizontal: "left", vertical: "top", wrapText: true };
    worksheet.mergeCells(`B${currentRow}:C${currentRow}`);
    currentRow++;

    // Add filter information with proper formatting
    worksheet.addRow([""]); // Spacer
    currentRow++;

    const filterTitleRow = worksheet.addRow(["ADDITIONAL INFORMATION", "", "", "", ""]);
    filterTitleRow.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
    filterTitleRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF9966FF" }
    };
    filterTitleRow.alignment = { horizontal: "left", vertical: "center", wrapText: true };
    filterTitleRow.height = 30;
    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
    currentRow++;

    // Add filter details with better spacing
    const filterDetails = [
      filterInfo.mode ? [filterInfo.mode === "Victim" ? "Exported For" : "Exported By", filterInfo.mode] : null,
      filterInfo.officer ? ["Assigned Officer", filterInfo.officer] : null,
      filterInfo.victim ? ["Victim Name", filterInfo.victim] : null,
      filterInfo.year ? ["Year", filterInfo.year] : null,
      filterInfo.month ? ["Month", filterInfo.month] : null,
      filterInfo.week ? ["Week", filterInfo.week] : null,
      filterInfo.purok ? ["Purok", filterInfo.purok] : null,
      filterInfo.status ? ["Status", filterInfo.status] : null,
      filterInfo.riskLevel ? ["Risk Level", filterInfo.riskLevel] : null,
      filterInfo.incidentType ? ["Incident Type", filterInfo.incidentType] : null,
      filterInfo.victimType ? ["Victim Type", filterInfo.victimType] : null,
    ].filter(item => item !== null);

    filterDetails.forEach((detail) => {
      const detailRow = worksheet.addRow([detail[0], detail[1], "", "", ""]);
      detailRow.font = { size: 11 };
      detailRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF0E6FF" }
      };
      detailRow.alignment = { horizontal: "left", vertical: "top", wrapText: true };
      detailRow.height = 28;
      detailRow.getCell(1).font = { bold: true, size: 11, color: { argb: "FF7A5AF8" } };
      detailRow.getCell(1).alignment = { horizontal: "left", vertical: "top", wrapText: true };
      detailRow.getCell(2).alignment = { horizontal: "left", vertical: "top", wrapText: true };
      worksheet.mergeCells(`B${currentRow}:E${currentRow}`);
      currentRow++;
    });

    // Add empty rows before data headers
    worksheet.addRow(["", "", "", "", ""]);
    currentRow++;
    worksheet.addRow(["", "", "", "", ""]);
    currentRow++;

    // Define data headers
    const headers = [
      "Case ID",
      "Report ID",
      "Victim Name",
      "Victim Type",
      "Incident Type",
      "Incident Subtype",
      "Description",
      "Perpetrator",
      "Location",
      "Date Reported",
      "Status",
      "Assigned Officer",
      "Risk Level",
      "Created At"
    ];

    if (includeRemarks) {
      headers.push("Remarks");
    }

    // Add header row for data
    const headerRow = worksheet.addRow(headers);

    // Style header row with larger, bolder formatting
    headerRow.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF7A5AF8" }
    };
    headerRow.alignment = { horizontal: "center", vertical: "center", wrapText: true };
    headerRow.height = 50;

    // Add borders to header row
    headerRow.eachCell((cell) => {
      cell.border = {
        top: { style: "medium", color: { argb: "FF000000" } },
        left: { style: "medium", color: { argb: "FF000000" } },
        bottom: { style: "medium", color: { argb: "FF000000" } },
        right: { style: "medium", color: { argb: "FF000000" } }
      };
    });

    // Add data rows - sorted by risk level (low, medium, high) then by incident type
    const riskLevelOrder = { "low": 1, "medium": 2, "high": 3 };
    const sortedData = [...data].sort((a, b) => {
      const aRisk = (a.riskLevel?.toLowerCase() || "unknown");
      const bRisk = (b.riskLevel?.toLowerCase() || "unknown");
      const riskCompare = (riskLevelOrder[aRisk] || 999) - (riskLevelOrder[bRisk] || 999);
      
      if (riskCompare !== 0) {
        return riskCompare;
      }
      
      // If risk levels are the same, sort by incident type
      const aIncidentType = (a.incidentType || "Unknown").toLowerCase();
      const bIncidentType = (b.incidentType || "Unknown").toLowerCase();
      return aIncidentType.localeCompare(bIncidentType);
    });

    sortedData.forEach((item) => {
      const rowData = [
        item.caseID || "",
        item.reportID || "",
        item.victimName || "",
        item.victimType || "",
        item.incidentType || "",
        item.incidentSubtype || "Uncategorized",
        item.description || "",
        item.perpetrator || "",
        item.location || "",
        item.dateReported ? new Date(item.dateReported).toLocaleString() : "",
        item.status || "",
        item.assignedOfficer || "",
        item.riskLevel || "",
        item.createdAt ? new Date(item.createdAt).toLocaleString() : ""
      ];

      if (includeRemarks) {
        rowData.push(item.remarks || "");
      }

      const row = worksheet.addRow(rowData);
      row.alignment = { horizontal: "left", vertical: "top", wrapText: true };
      
      // Calculate height based on remarks content for better visibility
      if (includeRemarks && item.remarks && item.remarks.length > 0) {
        // Estimate height: roughly 1 line per 80 characters, minimum 40px per remark
        const remarksLineCount = Math.ceil(item.remarks.length / 80);
        const estimatedHeight = Math.max(remarksLineCount * 20, 60);
        row.height = estimatedHeight;
      } else {
        row.height = "auto";
      }
      
      row.font = { size: 10 };

      // Add borders to data rows
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFD3D3D3" } },
          left: { style: "thin", color: { argb: "FFD3D3D3" } },
          bottom: { style: "thin", color: { argb: "FFD3D3D3" } },
          right: { style: "thin", color: { argb: "FFD3D3D3" } }
        };
        cell.alignment = { horizontal: "left", vertical: "top", wrapText: true };
      });
    });

    // Set column widths after adding data
    const columnWidths = [15, 15, 25, 18, 20, 22, 40, 25, 30, 20, 15, 22, 15, 20];
    if (includeRemarks) columnWidths.push(80);
    
    worksheet.columns.forEach((column, index) => {
      if (column && index < columnWidths.length) {
        column.width = columnWidths[index];
      }
    });

    // Freeze the header row (data headers, not summary)
    const headerRowNum = currentRow - data.length;
    worksheet.freezePane = `A${headerRowNum + 1}`;

    // Generate and save file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    saveAs(blob, filename);
  };

  // Get unique incident types
  const getUniqueIncidentTypes = () => {
    const types = allCases
      .map(c => c.incidentType)
      .filter(t => t && t.trim() !== "");
    return [...new Set(types)].sort();
  };

  // Get available years from all cases (excluding soft-deleted)
  const getAvailableYears = () => {
    let casesToCheck = allCases.filter(c => !c.deletedAt); // Exclude soft-deleted cases
    
    // Filter by officer if in officer mode
    if (exportMode === "officer" && selectedOfficer) {
      casesToCheck = casesToCheck.filter(
        c => c.assignedOfficer && c.assignedOfficer.toLowerCase() === selectedOfficer.toLowerCase()
      );
      // If victim is also selected, filter by victim
      if (selectedVictim) {
        casesToCheck = casesToCheck.filter(
          c => c.victimName && c.victimName.toLowerCase() === selectedVictim.toLowerCase()
        );
      }
    }
    // Filter by victim if in victim mode
    else if (exportMode === "victim" && selectedVictim) {
      casesToCheck = casesToCheck.filter(
        c => c.victimName && c.victimName.toLowerCase() === selectedVictim.toLowerCase()
      );
    }
    // For "all" mode, use all non-deleted cases
    
    const years = casesToCheck
      .map(c => c.createdAt ? new Date(c.createdAt).getFullYear() : null)
      .filter(y => y !== null);
    return [...new Set(years)].sort((a, b) => b - a);
  };

  // Get available months for a specific year (excluding soft-deleted)
  const getAvailableMonths = (year) => {
    if (!year) return [];
    let casesToCheck = allCases.filter(c => !c.deletedAt); // Exclude soft-deleted cases
    
    // Filter by officer if in officer mode
    if (exportMode === "officer" && selectedOfficer) {
      casesToCheck = casesToCheck.filter(
        c => c.assignedOfficer && c.assignedOfficer.toLowerCase() === selectedOfficer.toLowerCase()
      );
      // If victim is also selected, filter by victim
      if (selectedVictim) {
        casesToCheck = casesToCheck.filter(
          c => c.victimName && c.victimName.toLowerCase() === selectedVictim.toLowerCase()
        );
      }
    }
    // Filter by victim if in victim mode
    else if (exportMode === "victim" && selectedVictim) {
      casesToCheck = casesToCheck.filter(
        c => c.victimName && c.victimName.toLowerCase() === selectedVictim.toLowerCase()
      );
    }
    // For "all" mode, use all non-deleted cases
    
    const months = casesToCheck
      .map(c => {
        if (c.createdAt) {
          const date = new Date(c.createdAt);
          if (date.getFullYear() === parseInt(year)) {
            return date.getMonth();
          }
        }
        return null;
      })
      .filter(m => m !== null);
    return [...new Set(months)].sort((a, b) => a - b);
  };

  // Get week numbers for a specific year and month (excluding soft-deleted)
  const getAvailableWeeks = (year, month) => {
    if (!year || !month) return [];
    const weeks = new Set();
    let casesToCheck = allCases
      .filter(c => !c.deletedAt); // Exclude soft-deleted cases
    
    // Filter by officer if in officer mode
    if (exportMode === "officer" && selectedOfficer) {
      casesToCheck = casesToCheck.filter(
        c => c.assignedOfficer && c.assignedOfficer.toLowerCase() === selectedOfficer.toLowerCase()
      );
      // If victim is also selected, filter by victim
      if (selectedVictim) {
        casesToCheck = casesToCheck.filter(
          c => c.victimName && c.victimName.toLowerCase() === selectedVictim.toLowerCase()
        );
      }
    }
    // Filter by victim if in victim mode
    else if (exportMode === "victim" && selectedVictim) {
      casesToCheck = casesToCheck.filter(
        c => c.victimName && c.victimName.toLowerCase() === selectedVictim.toLowerCase()
      );
    }
    
    casesToCheck.forEach(c => {
      if (c.createdAt) {
        const date = new Date(c.createdAt);
        if (date.getFullYear() === parseInt(year) && date.getMonth() === parseInt(month)) {
          // Calculate week of month
          const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
          const weekOfMonth = Math.ceil((date.getDate() + firstDay.getDay()) / 7);
          weeks.add(weekOfMonth);
        }
      }
    });
    return [...weeks].sort((a, b) => a - b);
  };

  // Export all filtered cases to Excel

  const handleExportAllCSV = async () => {
    // Filter cases by date range if specified
    let casesToExport = filteredCases;
    
    if (exportFilters.year) {
      casesToExport = casesToExport.filter(c => {
        if (!c.createdAt) return false;
        const date = new Date(c.createdAt);
        if (date.getFullYear() !== parseInt(exportFilters.year)) return false;
        
        if (exportFilters.month !== "") {
          if (date.getMonth() !== parseInt(exportFilters.month)) return false;
          
          if (exportFilters.week !== "") {
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
            const weekOfMonth = Math.ceil((date.getDate() + firstDay.getDay()) / 7);
            if (weekOfMonth !== parseInt(exportFilters.week)) return false;
          }
        }
        return true;
      });
    }
    
    if (casesToExport.length === 0) {
      message.warning("No cases to export");
      return;
    }

    setExportLoading(true);
    try {
      const dataWithRemarks = [];

      for (const c of casesToExport) {
        // Fetch remarks for this case
        let remarksText = "";
        try {
          const remarksRes = await api.get(`/api/cases/${c.caseID}/remarks`);
          const remarks = remarksRes?.data?.data || [];
          if (remarks.length > 0) {
            remarksText = remarks
              .map(r => `[${r.actorName || 'System'} - ${r.createdAt ? new Date(r.createdAt).toLocaleString() : 'N/A'}]: ${r.content || ''}`)
              .join('\n');
          }
        } catch (err) {
          console.warn('Failed to fetch remarks for', c.caseID, err);
        }

        dataWithRemarks.push({
          ...c,
          remarks: remarksText
        });
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const filterInfo = {
        year: exportFilters.year || "All Years",
        month: exportFilters.month ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][parseInt(exportFilters.month)] : "All Months",
        week: exportFilters.week ? `Week ${exportFilters.week}` : "All Weeks",
        purok: exportFilters.purok || "All Puroks",
        status: exportFilters.status || "All Statuses",
        riskLevel: exportFilters.riskLevel || "All Risk Levels",
        incidentType: exportFilters.incidentType || "All Incident Types",
        victimType: exportFilters.victimType ? (exportFilters.victimType.charAt(0).toUpperCase() + exportFilters.victimType.slice(1)) : "All Victim Types"
      };
      await createExcelFile(dataWithRemarks, `VAWCare_All_Cases_${timestamp}.xlsx`, true, filterInfo);

      message.success(`Exported ${casesToExport.length} case(s) to Excel`);
    } catch (err) {
      console.error('Excel export error:', err);
      message.error('Failed to export Excel. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  // Export cases for a specific officer with filters
  const handleExportOfficerCases = async (officerName) => {
    if (!officerName || officerName.trim() === "") {
      message.warning("Please select an officer");
      return;
    }

    let officerCases = allCases
      .filter(c => !c.deletedAt) // Exclude soft-deleted cases
      .filter(
        c => c.assignedOfficer && c.assignedOfficer.toLowerCase() === officerName.toLowerCase()
      );

    // If victim is also selected, filter by victim
    if (selectedVictim) {
      officerCases = officerCases.filter(
        c => c.victimName && c.victimName.toLowerCase() === selectedVictim.toLowerCase()
      );
    }

    // Apply additional filters
    if (exportFilters.purok) {
      officerCases = officerCases.filter(c => 
        c.location && c.location.toLowerCase().includes(exportFilters.purok.toLowerCase())
      );
    }

    if (exportFilters.status) {
      officerCases = officerCases.filter(c => 
        c.status && c.status.toLowerCase() === exportFilters.status.toLowerCase()
      );
    }

    if (exportFilters.riskLevel) {
      officerCases = officerCases.filter(c => 
        c.riskLevel && c.riskLevel.toLowerCase() === exportFilters.riskLevel.toLowerCase()
      );
    }

    if (exportFilters.incidentType) {
      officerCases = officerCases.filter(c => 
        c.incidentType && c.incidentType.toLowerCase() === exportFilters.incidentType.toLowerCase()
      );
    }

    if (exportFilters.subtype) {
      officerCases = officerCases.filter(c => 
        c.subtype && c.subtype.toLowerCase() === exportFilters.subtype.toLowerCase()
      );
    }

    if (exportFilters.victimType) {
      officerCases = officerCases.filter(c => 
        c.victimType && c.victimType.toLowerCase() === exportFilters.victimType.toLowerCase()
      );
    }

    // Date filtering
    if (exportFilters.year) {
      officerCases = officerCases.filter(c => {
        if (!c.createdAt) return false;
        const caseYear = new Date(c.createdAt).getFullYear();
        return caseYear === parseInt(exportFilters.year);
      });
    }

    if (exportFilters.month && exportFilters.year) {
      officerCases = officerCases.filter(c => {
        if (!c.createdAt) return false;
        const caseDate = new Date(c.createdAt);
        const caseYear = caseDate.getFullYear();
        const caseMonth = caseDate.getMonth();
        return caseYear === parseInt(exportFilters.year) && caseMonth === parseInt(exportFilters.month);
      });
    }

    if (exportFilters.week && exportFilters.month && exportFilters.year) {
      officerCases = officerCases.filter(c => {
        if (!c.createdAt) return false;
        const caseDate = new Date(c.createdAt);
        const caseYear = caseDate.getFullYear();
        const caseMonth = caseDate.getMonth();
        const firstDay = new Date(caseYear, caseMonth, 1);
        const weekOfMonth = Math.ceil((caseDate.getDate() + firstDay.getDay()) / 7);
        return (
          caseYear === parseInt(exportFilters.year) &&
          caseMonth === parseInt(exportFilters.month) &&
          weekOfMonth === parseInt(exportFilters.week)
        );
      });
    }

    if (officerCases.length === 0) {
      message.warning(`No cases found matching the selected criteria`);
      return;
    }

    // Fetch remarks for each case
    const officerCasesWithRemarks = [];
    for (const c of officerCases) {
      let remarksText = "";
      try {
        const remarksRes = await api.get(`/api/cases/${c.caseID}/remarks`);
        const remarks = remarksRes?.data?.data || [];
        if (remarks.length > 0) {
          remarksText = remarks
            .map(r => `[${r.actorName || 'System'} - ${r.createdAt ? new Date(r.createdAt).toLocaleString() : 'N/A'}]: ${r.content || ''}`)
            .join('\n');
        }
      } catch (err) {
        console.warn('Failed to fetch remarks for', c.caseID, err);
      }
      officerCasesWithRemarks.push({
        ...c,
        remarks: remarksText
      });
    }

    const sanitizedOfficerName = officerName.replace(/[^a-zA-Z0-9]/g, "_");
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Create filter info object
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const filterInfo = {
      mode: "Assigned Officer",
      officer: officerName,
      victim: selectedVictim || null,
      purok: exportFilters.purok || null,
      status: exportFilters.status || null,
      riskLevel: exportFilters.riskLevel || null,
      incidentType: exportFilters.incidentType || null,
      victimType: exportFilters.victimType || null,
      year: exportFilters.year || null,
      month: exportFilters.month ? monthNames[parseInt(exportFilters.month)] : null,
      week: exportFilters.week ? `Week ${exportFilters.week}` : null
    };
    
    // Create filename based on whether victim is also selected
    let filename;
    if (selectedVictim) {
      const sanitizedVictimName = selectedVictim.replace(/[^a-zA-Z0-9]/g, "_");
      filename = `Cases_${sanitizedOfficerName}_Victim_${sanitizedVictimName}_${timestamp}.xlsx`;
    } else {
      filename = `Cases_${sanitizedOfficerName}_${timestamp}.xlsx`;
    }

    await createExcelFile(officerCasesWithRemarks, filename, true, filterInfo);

    const exportMessage = selectedVictim 
      ? `Exported ${officerCases.length} case(s) for ${officerName} handling ${selectedVictim}'s cases`
      : `Exported ${officerCases.length} case(s) for ${officerName}`;
    message.success(exportMessage);
    setExportModalVisible(false);
    setSelectedOfficer("");
    setSelectedVictim("");
    setExportFilters({ purok: "", status: "", riskLevel: "", incidentType: "", subtype: "", victimType: "", year: "", month: "", week: "" });
    setExportType("csv");
    setExportMode("officer");
  };

  // Export cases for a specific victim with filters
  const handleExportVictimCases = async (victimName) => {
    if (!victimName || victimName.trim() === "") {
      message.warning("Please select a victim");
      return;
    }

    let victimCases = allCases
      .filter(c => !c.deletedAt) // Exclude soft-deleted cases
      .filter(
        c => c.victimName && c.victimName.toLowerCase() === victimName.toLowerCase()
      );

    // Apply additional filters
    if (exportFilters.purok) {
      victimCases = victimCases.filter(c => 
        c.location && c.location.toLowerCase().includes(exportFilters.purok.toLowerCase())
      );
    }

    if (exportFilters.status) {
      victimCases = victimCases.filter(c => 
        c.status && c.status.toLowerCase() === exportFilters.status.toLowerCase()
      );
    }

    if (exportFilters.riskLevel) {
      victimCases = victimCases.filter(c => 
        c.riskLevel && c.riskLevel.toLowerCase() === exportFilters.riskLevel.toLowerCase()
      );
    }

    if (exportFilters.incidentType) {
      victimCases = victimCases.filter(c => 
        c.incidentType && c.incidentType.toLowerCase() === exportFilters.incidentType.toLowerCase()
      );
    }

    if (exportFilters.subtype) {
      victimCases = victimCases.filter(c => 
        c.subtype && c.subtype.toLowerCase() === exportFilters.subtype.toLowerCase()
      );
    }

    if (exportFilters.victimType) {
      victimCases = victimCases.filter(c => 
        c.victimType && c.victimType.toLowerCase() === exportFilters.victimType.toLowerCase()
      );
    }

    // Date filtering
    if (exportFilters.year) {
      victimCases = victimCases.filter(c => {
        if (!c.createdAt) return false;
        const caseYear = new Date(c.createdAt).getFullYear();
        return caseYear === parseInt(exportFilters.year);
      });
    }

    if (exportFilters.month && exportFilters.year) {
      victimCases = victimCases.filter(c => {
        if (!c.createdAt) return false;
        const caseDate = new Date(c.createdAt);
        const caseYear = caseDate.getFullYear();
        const caseMonth = caseDate.getMonth();
        return caseYear === parseInt(exportFilters.year) && caseMonth === parseInt(exportFilters.month);
      });
    }

    if (exportFilters.week && exportFilters.month && exportFilters.year) {
      victimCases = victimCases.filter(c => {
        if (!c.createdAt) return false;
        const caseDate = new Date(c.createdAt);
        const caseYear = caseDate.getFullYear();
        const caseMonth = caseDate.getMonth();
        const firstDay = new Date(caseYear, caseMonth, 1);
        const weekOfMonth = Math.ceil((caseDate.getDate() + firstDay.getDay()) / 7);
        return (
          caseYear === parseInt(exportFilters.year) &&
          caseMonth === parseInt(exportFilters.month) &&
          weekOfMonth === parseInt(exportFilters.week)
        );
      });
    }

    if (victimCases.length === 0) {
      message.warning(`No cases found matching the selected criteria`);
      return;
    }

    // Fetch remarks for each case
    const victimCasesWithRemarks = [];
    for (const c of victimCases) {
      let remarksText = "";
      try {
        const remarksRes = await api.get(`/api/cases/${c.caseID}/remarks`);
        const remarks = remarksRes?.data?.data || [];
        if (remarks.length > 0) {
          remarksText = remarks
            .map(r => `[${r.actorName || 'System'} - ${r.createdAt ? new Date(r.createdAt).toLocaleString() : 'N/A'}]: ${r.content || ''}`)
            .join('\n');
        }
      } catch (err) {
        console.warn('Failed to fetch remarks for', c.caseID, err);
      }
      victimCasesWithRemarks.push({
        ...c,
        remarks: remarksText
      });
    }

    // Generate Excel file
    const sanitizedVictimName = victimName.replace(/[^a-zA-Z0-9]/g, "_");
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Cases_Victim_${sanitizedVictimName}_${timestamp}.xlsx`;
    
    // Create filter info object
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const filterInfo = {
      mode: "Victim",
      victim: victimName,
      purok: exportFilters.purok || null,
      status: exportFilters.status || null,
      riskLevel: exportFilters.riskLevel || null,
      incidentType: exportFilters.incidentType || null,
      victimType: exportFilters.victimType || null,
      year: exportFilters.year || null,
      month: exportFilters.month ? monthNames[parseInt(exportFilters.month)] : null,
      week: exportFilters.week ? `Week ${exportFilters.week}` : null
    };
    
    await createExcelFile(victimCasesWithRemarks, filename, true, filterInfo);

    message.success(`Exported ${victimCases.length} case(s) for victim: ${victimName}`);
    setExportModalVisible(false);
    setSelectedOfficer("");
    setSelectedVictim("");
    setExportFilters({ purok: "", status: "", riskLevel: "", incidentType: "", subtype: "", victimType: "", year: "", month: "", week: "" });
    setExportType("csv");
    setExportMode("officer");
  };

  // Get filtered case count including date filters for all modes
  const getFilteredAllCasesCount = () => {
    let casesToCount = filteredCases;
    
    if (exportFilters.year) {
      casesToCount = casesToCount.filter(c => {
        if (!c.createdAt) return false;
        const date = new Date(c.createdAt);
        if (date.getFullYear() !== parseInt(exportFilters.year)) return false;
        
        if (exportFilters.month !== "") {
          if (date.getMonth() !== parseInt(exportFilters.month)) return false;
          
          if (exportFilters.week !== "") {
            const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
            const weekOfMonth = Math.ceil((date.getDate() + firstDay.getDay()) / 7);
            if (weekOfMonth !== parseInt(exportFilters.week)) return false;
          }
        }
        return true;
      });
    }
    
    return casesToCount.length;
  };

  // Get filtered case count for preview
  const getFilteredCaseCount = () => {
    let cases = [];
    
    if (exportMode === "officer") {
      if (!selectedOfficer) return 0;
      cases = allCases
        .filter(c => !c.deletedAt) // Exclude soft-deleted cases
        .filter(
          c => c.assignedOfficer && c.assignedOfficer.toLowerCase() === selectedOfficer.toLowerCase()
        );
      // If victim is also selected in officer mode, further filter by victim
      if (selectedVictim) {
        cases = cases.filter(
          c => c.victimName && c.victimName.toLowerCase() === selectedVictim.toLowerCase()
        );
      }
    } else if (exportMode === "victim") {
      if (!selectedVictim) return 0;
      cases = allCases
        .filter(c => !c.deletedAt) // Exclude soft-deleted cases
        .filter(
          c => c.victimName && c.victimName.toLowerCase() === selectedVictim.toLowerCase()
        );
    } else {
      return 0;
    }

    if (exportFilters.purok) {
      cases = cases.filter(c => 
        c.location && c.location.toLowerCase().includes(exportFilters.purok.toLowerCase())
      );
    }

    if (exportFilters.status) {
      cases = cases.filter(c => 
        c.status && c.status.toLowerCase() === exportFilters.status.toLowerCase()
      );
    }

    if (exportFilters.riskLevel) {
      cases = cases.filter(c => 
        c.riskLevel && c.riskLevel.toLowerCase() === exportFilters.riskLevel.toLowerCase()
      );
    }

    if (exportFilters.incidentType) {
      cases = cases.filter(c => 
        c.incidentType && c.incidentType.toLowerCase() === exportFilters.incidentType.toLowerCase()
      );
    }

    if (exportFilters.subtype) {
      cases = cases.filter(c => 
        c.subtype && c.subtype.toLowerCase() === exportFilters.subtype.toLowerCase()
      );
    }

    if (exportFilters.victimType) {
      cases = cases.filter(c => 
        c.victimType && c.victimType.toLowerCase() === exportFilters.victimType.toLowerCase()
      );
    }

    // Date filtering
    if (exportFilters.year) {
      cases = cases.filter(c => {
        if (!c.createdAt) return false;
        const caseYear = new Date(c.createdAt).getFullYear();
        return caseYear === parseInt(exportFilters.year);
      });
    }

    if (exportFilters.month && exportFilters.year) {
      cases = cases.filter(c => {
        if (!c.createdAt) return false;
        const caseDate = new Date(c.createdAt);
        const caseYear = caseDate.getFullYear();
        const caseMonth = caseDate.getMonth();
        return caseYear === parseInt(exportFilters.year) && caseMonth === parseInt(exportFilters.month);
      });
    }

    if (exportFilters.week && exportFilters.month && exportFilters.year) {
      cases = cases.filter(c => {
        if (!c.createdAt) return false;
        const caseDate = new Date(c.createdAt);
        const caseYear = caseDate.getFullYear();
        const caseMonth = caseDate.getMonth();
        const firstDay = new Date(caseYear, caseMonth, 1);
        const weekOfMonth = Math.ceil((caseDate.getDate() + firstDay.getDay()) / 7);
        return (
          caseYear === parseInt(exportFilters.year) &&
          caseMonth === parseInt(exportFilters.month) &&
          weekOfMonth === parseInt(exportFilters.week)
        );
      });
    }

    return cases.length;
  };

  // Fetch DSS suggestion for a case
  const fetchDSSForCase = async (caseData) => {
    try {
      const payload = {
        incidentType: caseData.incidentType,
        description: caseData.description,
        assignedOfficer: caseData.assignedOfficer,
        status: caseData.status,
        perpetrator: caseData.perpetrator,
        victimId: caseData.victimID || caseData.victimId,
        victimType: caseData.victimType || null,
        riskLevel: caseData.dssManualOverride ? (caseData.riskLevel || null) : null
      };
      const res = await api.post('/api/dss/suggest', payload);
      return res.data.data;
    } catch (err) {
      console.warn('DSS suggestion failed for case', caseData.caseID, err);
      return null;
    }
  };

  // Generate PDF for selected cases
  const handleExportPDF = async () => {
    if (selectedCases.length === 0) {
      message.warning("Please select at least one case to export");
      return;
    }

    if (exportMode === "officer" && !selectedOfficer) {
      message.warning("Please select an officer first");
      return;
    }

    setExportLoading(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Title
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text('VAWCare Case Report', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Officer: ${selectedOfficer}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 6;
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;

      // Process each selected case
      for (let i = 0; i < selectedCases.length; i++) {
        const caseId = selectedCases[i];
        let caseData = allCases.find(c => c.caseID === caseId);
        
        if (!caseData) continue;

        // Fetch complete case details from API to ensure we have all data
        try {
          const detailRes = await api.get(`/api/cases/${caseId}`);
          if (detailRes?.data?.data) {
            caseData = detailRes.data.data;
          }
        } catch (err) {
          console.warn('Failed to fetch detailed case data for', caseId, err);
          // Continue with existing data if API fails
        }

        // Fetch DSS data
        const dssData = await fetchDSSForCase(caseData);

        // Fetch remarks for this case
        let remarks = [];
        try {
          const remarksRes = await api.get(`/api/cases/${caseId}/remarks`);
          remarks = remarksRes?.data?.data || [];
        } catch (err) {
          console.warn('Failed to fetch remarks for', caseId, err);
        }

        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = margin;
        }

        // Case Header
        doc.setFillColor(122, 90, 248);
        doc.rect(margin, yPosition, pageWidth - 2 * margin, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Case ${i + 1} of ${selectedCases.length}: ${caseData.caseID}`, margin + 5, yPosition + 7);
        doc.setTextColor(0, 0, 0);
        yPosition += 15;

        // Case Information Table - matches CaseDetail view
        const caseInfo = [
          ['Report ID', caseData.reportID || 'N/A'],
          ['Victim Type', caseData.victimType ? caseData.victimType.charAt(0).toUpperCase() + caseData.victimType.slice(1) : 'N/A'],
          ['Victim Name', caseData.victimName || 'N/A'],
          ['Birthdate', caseData.victimBirthdate ? new Date(caseData.victimBirthdate).toLocaleDateString() : 'N/A'],
          ['Age', caseData.victimAge ? String(caseData.victimAge) : 'N/A'],
          ...(caseData.victimType === 'child' ? [
            ['Gender', caseData.victimGender ? caseData.victimGender.charAt(0).toUpperCase() + caseData.victimGender.slice(1) : 'N/A']
          ] : []),
          ['Incident Type', caseData.incidentType || 'N/A'],
          ['Perpetrator', caseData.perpetrator || 'N/A'],
          ['Location', caseData.location || 'N/A'],
          ['Status', caseData.status || 'N/A'],
          ['Assigned Officer', caseData.assignedOfficer || 'N/A'],
          ['Risk Level', caseData.riskLevel || 'N/A'],
          ['Date Reported', caseData.dateReported ? new Date(caseData.dateReported).toLocaleString() : 'N/A'],
          ['Created At', caseData.createdAt ? new Date(caseData.createdAt).toLocaleString() : 'N/A']
        ];

        autoTable(doc, {
          startY: yPosition,
          head: [['Field', 'Value']],
          body: caseInfo,
          theme: 'grid',
          headStyles: { fillColor: [122, 90, 248], textColor: 255, fontStyle: 'bold' },
          margin: { left: margin, right: margin },
          styles: { fontSize: 9, cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: 50, fontStyle: 'bold' },
            1: { cellWidth: 'auto' }
          }
        });

        yPosition = doc.lastAutoTable.finalY + 5;

        // Description
        if (caseData.description) {
          if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = margin;
          }

          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          doc.text('Description:', margin, yPosition);
          yPosition += 5;

          doc.setFont(undefined, 'normal');
          const descLines = doc.splitTextToSize(caseData.description, pageWidth - 2 * margin);
          doc.text(descLines, margin, yPosition);
          yPosition += descLines.length * 5 + 5;
        }

        // DSS Information
        if (dssData) {
          if (yPosition > pageHeight - 60) {
            doc.addPage();
            yPosition = margin;
          }

          doc.setFillColor(250, 247, 255);
          doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F');
          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(122, 90, 248);
          doc.text('Decision Support System (DSS) Analysis', margin + 5, yPosition + 6);
          doc.setTextColor(0, 0, 0);
          yPosition += 12;

          const dssInfo = [];
          
          if (dssData.predictedRisk) {
            dssInfo.push(['Predicted Risk Type', dssData.predictedRisk]);
          }
          if (dssData.riskLevel) {
            dssInfo.push(['DSS Risk Level', dssData.riskLevel]);
          }
          if (dssData.detectionMethod) {
            dssInfo.push(['Detection Method', dssData.detectionMethod]);
          }
          if (dssData.requiresImmediateAssistance) {
            dssInfo.push(['Immediate Assistance', 'YES - URGENT ACTION REQUIRED']);
          }
          if (dssData.matchedKeyword) {
            dssInfo.push(['Matched Keyword', dssData.matchedKeyword]);
          }
          if (dssData.retractionAnalysis && dssData.retractionAnalysis.hasRetractionPattern) {
            dssInfo.push(['Retraction Risk', `${dssData.retractionAnalysis.retractionRisk} (${dssData.retractionAnalysis.cancelledCases} cancelled cases)`]);
          }

          if (dssInfo.length > 0) {
            autoTable(doc, {
              startY: yPosition,
              body: dssInfo,
              theme: 'plain',
              margin: { left: margin + 5, right: margin },
              styles: { fontSize: 9, cellPadding: 2 },
              columnStyles: {
                0: { cellWidth: 60, fontStyle: 'bold', textColor: [122, 90, 248] },
                1: { cellWidth: 'auto' }
              }
            });

            yPosition = doc.lastAutoTable.finalY + 5;
          }

          // DSS Suggestion
          if (dssData.suggestion) {
            if (yPosition > pageHeight - 30) {
              doc.addPage();
              yPosition = margin;
            }

            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text('Recommended Actions:', margin + 5, yPosition);
            yPosition += 5;

            doc.setFont(undefined, 'normal');
            doc.setFontSize(9);
            const suggestionLines = doc.splitTextToSize(dssData.suggestion, pageWidth - 2 * margin - 10);
            
            // Add background box for suggestion
            const boxHeight = suggestionLines.length * 4 + 6;
            let bgColor;
            if (dssData.riskLevel === 'High') {
              bgColor = [255, 241, 240]; // Red tint
            } else if (dssData.riskLevel === 'Medium') {
              bgColor = [255, 251, 230]; // Yellow tint
            } else {
              bgColor = [246, 255, 237]; // Green tint
            }
            doc.setFillColor(...bgColor);
            doc.rect(margin + 5, yPosition - 2, pageWidth - 2 * margin - 10, boxHeight, 'F');
            
            doc.text(suggestionLines, margin + 8, yPosition + 2);
            yPosition += boxHeight + 5;
          }
        }

        // Remarks Section
        if (remarks && remarks.length > 0) {
          if (yPosition > pageHeight - 60) {
            doc.addPage();
            yPosition = margin;
          }

          doc.setFillColor(250, 247, 255);
          doc.rect(margin, yPosition, pageWidth - 2 * margin, 8, 'F');
          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          doc.setTextColor(122, 90, 248);
          doc.text('Remarks and Notes', margin + 5, yPosition + 6);
          doc.setTextColor(0, 0, 0);
          yPosition += 12;

          remarks.forEach((remark, idx) => {
            if (yPosition > pageHeight - 30) {
              doc.addPage();
              yPosition = margin;
            }

            // Remark header with timestamp
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            const remarkDate = remark.createdAt ? new Date(remark.createdAt).toLocaleString() : 'N/A';
            const remarkBy = remark.actorName || 'System';
            doc.text(`${idx + 1}. ${remarkBy} (${remarkDate})`, margin + 5, yPosition);
            yPosition += 5;

            // Remark content
            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);
            const contentLines = doc.splitTextToSize(remark.content || '', pageWidth - 2 * margin - 15);
            doc.text(contentLines, margin + 8, yPosition);
            yPosition += contentLines.length * 4 + 3;
          });
        }

        // Add spacing between cases
        yPosition += 10;

        // Add separator line if not last case
        if (i < selectedCases.length - 1) {
          if (yPosition > pageHeight - 20) {
            doc.addPage();
            yPosition = margin;
          }
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 10;
        }
      }

      // Save PDF
      const timestamp = new Date().toISOString().split('T')[0];
      doc.save(`VAWCare_Cases_${timestamp}.pdf`);
      
      message.success(`Successfully exported ${selectedCases.length} case(s) to PDF`);
      setExportModalVisible(false);
      setSelectedCases([]);
      setExportType("csv");
    } catch (err) {
      console.error('PDF export error:', err);
      message.error('Failed to generate PDF. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  // Handle case selection for PDF export
  const handleCaseSelection = (caseId, checked) => {
    if (checked) {
      setSelectedCases([...selectedCases, caseId]);
    } else {
      setSelectedCases(selectedCases.filter(id => id !== caseId));
    }
  };

  // Select all cases
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedCases(filteredCases.map(c => c.caseID));
    } else {
      setSelectedCases([]);
    }
  };

  const columns = [
    {
      title: "Case ID",
      dataIndex: "caseID",
      key: "caseID",
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: "Report ID",
      dataIndex: "reportID",
      key: "reportID",
      render: (r) => r || <Text type="secondary">N/A</Text>,
    },
    { title: "Incident Type", dataIndex: "incidentType", key: "incidentType" },
    {
      title: "Incident Subtype",
      dataIndex: "incidentSubtype",
      key: "incidentSubtype",
      render: (s) => s || <Text type="secondary">—</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (s) => (
        <Tag color={statusColor(s)} style={{ borderRadius: 999 }}>
          {s}
        </Tag>
      ),
    },
    {
      title: "Assigned Officer",
      dataIndex: "assignedOfficer",
      key: "assignedOfficer",
      render: (v) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "Risk",
      dataIndex: "riskLevel",
      key: "riskLevel",
      render: (r) => (
        <Tag color={riskColor(r)} style={{ borderRadius: 999 }}>
          {r || "—"}
        </Tag>
      ),
    },
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (d) => (d ? new Date(d).toLocaleString() : ""),
      sorter: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    },
    {
      title: "Actions",
      key: "actions",
      fixed: "right",
      render: (_, rec) => (
        <Space size={4}>
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<FileTextOutlined />}
              onClick={() => handleViewCase(rec)}
              className="row-action"
              style={{ color: '#1890ff' }}
            />
          </Tooltip>
          <Tooltip title="Edit Case">
            <Button
              type="text"
              icon={<FormOutlined />}
              onClick={() => handleEditCase(rec)}
              className="row-action"
              style={{ color: '#52c41a' }}
            />
          </Tooltip>
          <Tooltip title="Delete Case">
            <Button
              type="text"
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => showDeleteConfirm(rec)}
              className="row-action"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // Simplified mobile columns for small screens
  const columnsMobile = [
    {
      title: "Case",
      dataIndex: "caseID",
      key: "caseID",
      width: 90,
      fixed: 'left',
      render: (v) => <Text strong style={{ fontSize: 14 }}>{v}</Text>,
    },
    {
      title: "Type",
      dataIndex: "incidentType",
      key: "incidentType",
      width: 110,
      render: (t) => <span style={{ fontSize: 13 }}>{t}</span>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (s) => (
        <Tag color={statusColor(s)} style={{ borderRadius: 999, fontSize: 12, padding: '2px 10px' }}>{s}</Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      fixed: 'right',
      align: "center",
      render: (_, rec) => (
        <Space size={4} wrap={false}>
          <Tooltip title="View">
            <Button 
              type="text" 
              size="small" 
              icon={<FileTextOutlined style={{ fontSize: 18 }} />} 
              onClick={() => handleViewCase(rec)} 
              style={{ color: '#1890ff', padding: '4px 6px' }} 
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button 
              type="text" 
              size="small" 
              icon={<FormOutlined style={{ fontSize: 18 }} />} 
              onClick={() => handleEditCase(rec)} 
              style={{ color: '#52c41a', padding: '4px 6px' }} 
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button 
              type="text" 
              size="small" 
              danger 
              icon={<CloseCircleOutlined style={{ fontSize: 18 }} />} 
              onClick={() => showDeleteConfirm(rec)}
              style={{ padding: '4px 6px' }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: BRAND.bg }}>
      {/* Sticky header (matches dashboard look) */}
      <Header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 60,
          background: BRAND.bg,
          borderBottom: `1px solid ${BRAND.soft}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingInline: isMdUp ? 20 : 12,
          paddingBlock: isXs ? 8 : 12,
          height: isXs ? 64 : "auto",
          lineHeight: 1.2,
          backdropFilter: "blur(6px)",
        }}
      >
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: isXs ? 8 : 12, 
          minWidth: 0,
          flex: 1,
          overflow: "hidden"
        }}>
          {/* sidebar toggle (visible on small screens) */}
          {!isMdUp && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => window.dispatchEvent(new Event("toggle-sider"))}
              aria-label="Toggle sidebar"
              style={{
                width: isXs ? 36 : 40,
                height: isXs ? 36 : 40,
                minWidth: isXs ? 36 : 40,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 10,
                background: "#ffffffcc",
                boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
                padding: 0,
                fontSize: 18,
              }}
            />
          )}

          <Space direction="vertical" size={0} style={{ minWidth: 0, overflow: "hidden" }}>
            <Title 
              level={isXs ? 5 : 4} 
              style={{ 
                margin: 0, 
                color: BRAND.violet,
                fontSize: isXs ? 14 : undefined,
                lineHeight: isXs ? 1.3 : 1.4,
                whiteSpace: isXs ? "nowrap" : "normal",
                overflow: "hidden",
                textOverflow: "ellipsis"
              }}
            >
              Case Management
            </Title>
            {isMdUp && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                Review, create, and update cases
              </Text>
            )}
          </Space>
        </div>

        <Space 
          wrap 
          size={isXs ? 4 : 8}
          style={{ flexShrink: 0 }}
        >
          <Button
            type="primary"
            onClick={openAddModal}
            size={isXs ? "middle" : "middle"}
            style={{
              background: BRAND.violet,
              borderColor: BRAND.violet,
              borderRadius: isXs ? 8 : 12,
              fontWeight: 700,
              fontSize: isXs ? 13 : 14,
              height: isXs ? 32 : 36,
              padding: isXs ? "0 12px" : "4px 15px"
            }}
            icon={!isMdUp ? undefined : undefined}
          >
            {isMdUp ? "Add Case" : "Add"}
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => setExportModalVisible(true)}
            size={isXs ? "middle" : "middle"}
            style={{ 
              borderColor: BRAND.violet, 
              color: BRAND.violet, 
              borderRadius: isXs ? 8 : 12, 
              fontWeight: 700,
              fontSize: isXs ? 13 : 14,
              height: isXs ? 32 : 36,
              padding: isXs ? "0 8px" : "4px 15px"
            }}
            title="Export Cases"
          >
            {isMdUp ? "Export" : null}
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchAllCases}
            size={isXs ? "middle" : "middle"}
            style={{ 
              borderColor: BRAND.violet, 
              color: BRAND.violet, 
              borderRadius: isXs ? 8 : 12, 
              fontWeight: 700,
              fontSize: isXs ? 13 : 14,
              height: isXs ? 32 : 36,
              padding: isXs ? "0 8px" : "4px 15px"
            }}
            title="Refresh"
          >
            {isMdUp ? "Refresh" : null}
          </Button>
        </Space>
      </Header>

      <Content
        style={{
          width: "100%",
          minWidth: 0,
          overflow: "auto",
          flex: 1,
          boxSizing: "border-box",
        }}
      >
        <div style={{
          padding: isXs ? 8 : screens.sm ? 10 : 12,
          width: "100%",
          maxWidth: "100%",
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: isXs ? 8 : 10,
          paddingInline: isXs ? 4 : screens.sm ? 8 : 12,
          transition: "width .25s ease",
          boxSizing: "border-box",
          minHeight: "100%",
        }}>
          {/* Insights Card */}
          <Card
            bordered
            style={{
              marginBottom: screens.xs ? 12 : 16,
              borderRadius: screens.xs ? 12 : 18,
              borderColor: BRAND.soft,
              boxShadow: "0 20px 46px rgba(122,90,248,0.06)",
              background: "linear-gradient(145deg, rgba(255,255,255,0.92), rgba(250,247,255,0.88))",
              cursor: "pointer",
              transition: "all 0.3s ease",
              position: "relative",
              overflow: "hidden"
            }}
            bodyStyle={{ padding: screens.xs ? 12 : 20 }}
            onClick={() => navigate("/admin/analytics")}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 24px 52px rgba(122,90,248,0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 20px 46px rgba(122,90,248,0.06)";
            }}
          >
            <div style={{ 
              position: "absolute", 
              top: screens.xs ? 8 : 12, 
              right: screens.xs ? 8 : 12,
              background: "#fff",
              color: BRAND.violet,
              padding: screens.xs ? "4px 10px" : "6px 14px",
              borderRadius: 999,
              fontSize: screens.xs ? 11 : 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 4,
              border: `1.5px solid ${BRAND.violet}`,
              zIndex: 1
            }}>
              View Full Analytics
            </div>

            <div style={{ marginBottom: 16 }}>
              <Space direction="vertical" size={2}>
                <Title level={5} style={{ margin: 0, color: BRAND.violet }}>
                  <FileTextOutlined style={{ marginRight: 8 }} />
                  Quick Insights
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Key metrics and analytics overview • Click to explore more
                </Text>
              </Space>
            </div>
            
            <Row gutter={[isXs ? 8 : 16, isXs ? 8 : 16]}>
              <Col xs={24} sm={24} md={24} lg={24} xl={24} style={{ display: 'flex', gap: isXs ? 8 : 16, flexWrap: isXs ? 'wrap' : 'nowrap', justifyContent: 'space-between' }}>
                <Card 
                  size="small" 
                  style={{ 
                    borderRadius: 12,
                    border: `1px solid ${BRAND.soft}`,
                    background: "linear-gradient(135deg, #f6f3ff, #ffffff)",
                    textAlign: "center",
                    flex: 1,
                    minWidth: isXs ? 'calc(50% - 4px)' : 'auto',
                    minHeight: isXs ? 100 : 110
                  }}
                  bodyStyle={{ 
                    padding: screens.xs ? "12px 8px" : "16px 12px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center"
                  }}
                >
                  <div style={{ padding: screens.xs ? "4px 0" : "8px 0" }}>
                    <FolderOpenOutlined style={{ fontSize: screens.xs ? 20 : 24, color: BRAND.violet, marginBottom: 4 }} />
                    <div style={{ fontSize: screens.xs ? 11 : 12, color: "#666", marginBottom: 4 }}>
                      Total Cases
                    </div>
                    <div style={{ 
                      fontSize: screens.xs ? 20 : 24, 
                      fontWeight: 700, 
                      color: BRAND.violet
                    }}>
                      {analyticsData.totalCases}
                    </div>
                  </div>
                </Card>
                
                <Card 
                  size="small" 
                  style={{ 
                    borderRadius: 12,
                    border: "1px solid rgba(250,173,20,0.2)",
                    background: "linear-gradient(135deg, #fffbf0, #ffffff)",
                    textAlign: "center",
                    flex: 1,
                    minWidth: isXs ? 'calc(50% - 4px)' : 'auto',
                    minHeight: isXs ? 100 : 110
                  }}
                  bodyStyle={{ 
                    padding: screens.xs ? "12px 8px" : "16px 12px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center"
                  }}
                >
                  <div style={{ padding: screens.xs ? "4px 0" : "8px 0" }}>
                    <FolderOpenOutlined style={{ fontSize: screens.xs ? 20 : 24, color: "#faad14", marginBottom: 4 }} />
                    <div style={{ fontSize: screens.xs ? 11 : 12, color: "#666", marginBottom: 4 }}>
                      Open Cases
                    </div>
                    <div style={{ 
                      fontSize: screens.xs ? 20 : 24, 
                      fontWeight: 700, 
                      color: "#faad14"
                    }}>
                      {analyticsData.openCases}
                    </div>
                  </div>
                </Card>
                
                <Card 
                  size="small" 
                  style={{ 
                    borderRadius: 12,
                    border: "1px solid rgba(82,196,26,0.2)",
                    background: "linear-gradient(135deg, #f6ffed, #ffffff)",
                    textAlign: "center",
                    flex: 1,
                    minWidth: isXs ? 'calc(50% - 4px)' : 'auto',
                    minHeight: isXs ? 100 : 110
                  }}
                  bodyStyle={{ 
                    padding: screens.xs ? "12px 8px" : "16px 12px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center"
                  }}
                >
                  <div style={{ padding: screens.xs ? "4px 0" : "8px 0" }}>
                    <CheckCircleOutlined style={{ fontSize: screens.xs ? 20 : 24, color: "#52c41a", marginBottom: 4 }} />
                    <div style={{ fontSize: screens.xs ? 11 : 12, color: "#666", marginBottom: 4 }}>
                      Resolved
                    </div>
                    <div style={{ 
                      fontSize: screens.xs ? 20 : 24, 
                      fontWeight: 700, 
                      color: "#52c41a"
                    }}>
                      {analyticsData.resolvedCases}
                    </div>
                  </div>
                </Card>
                
                <Card 
                  size="small" 
                  style={{ 
                    borderRadius: 12,
                    border: "1px solid rgba(255,77,79,0.2)",
                    background: "linear-gradient(135deg, #fff1f0, #ffffff)",
                    textAlign: "center",
                    flex: 1,
                    minWidth: isXs ? 'calc(50% - 4px)' : 'auto',
                    minHeight: isXs ? 100 : 110
                  }}
                  bodyStyle={{ 
                    padding: screens.xs ? "12px 8px" : "16px 12px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center"
                  }}
                >
                  <div style={{ padding: screens.xs ? "4px 0" : "8px 0" }}>
                    <WarningOutlined style={{ fontSize: screens.xs ? 20 : 24, color: "#ff4d4f", marginBottom: 4 }} />
                    <div style={{ fontSize: screens.xs ? 11 : 12, color: "#666", marginBottom: 4 }}>
                      High Risk
                    </div>
                    <div style={{ 
                      fontSize: screens.xs ? 20 : 24, 
                      fontWeight: 700, 
                      color: "#ff4d4f"
                    }}>
                      {analyticsData.highRiskCases}
                    </div>
                  </div>
                </Card>
                
                <Card 
                  size="small" 
                  style={{ 
                    borderRadius: 12,
                    border: `1px solid ${BRAND.soft}`,
                    background: "linear-gradient(135deg, #fff0f7, #ffffff)",
                    textAlign: "center",
                    flex: 1,
                    minWidth: isXs ? 'calc(50% - 4px)' : 'auto',
                    minHeight: isXs ? 100 : 110
                  }}
                  bodyStyle={{ 
                    padding: screens.xs ? "12px 8px" : "16px 12px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center"
                  }}
                >
                  <div style={{ padding: screens.xs ? "4px 0" : "8px 0" }}>
                    <FireOutlined style={{ fontSize: screens.xs ? 20 : 24, color: BRAND.pink, marginBottom: 4 }} />
                    <div style={{ fontSize: screens.xs ? 11 : 12, color: "#666", marginBottom: 4 }}>
                      Most Common
                    </div>
                    <div style={{ 
                      fontSize: screens.xs ? 12 : 14, 
                      fontWeight: 700, 
                      color: BRAND.pink,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      padding: "0 4px"
                    }}>
                      {analyticsData.mostCommonIncident}
                    </div>
                  </div>
                </Card>
                
                <Card 
                  size="small" 
                  style={{ 
                    borderRadius: 12,
                    border: `1px solid ${BRAND.soft}`,
                    background: "linear-gradient(135deg, #f0f9ff, #ffffff)",
                    textAlign: "center",
                    flex: 1,
                    minWidth: isXs ? 'calc(50% - 4px)' : 'auto',
                    minHeight: isXs ? 100 : 110
                  }}
                  bodyStyle={{ 
                    padding: screens.xs ? "12px 8px" : "16px 12px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center"
                  }}
                >
                  <div style={{ padding: screens.xs ? "4px 0" : "8px 0" }}>
                    <EnvironmentOutlined style={{ fontSize: screens.xs ? 20 : 24, color: "#1890ff", marginBottom: 4 }} />
                    <div style={{ fontSize: screens.xs ? 11 : 12, color: "#666", marginBottom: 4 }}>
                      Hotspot Area
                    </div>
                    <div style={{ 
                      fontSize: screens.xs ? 12 : 14, 
                      fontWeight: 700, 
                      color: "#1890ff",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      padding: "0 4px"
                    }}>
                      {analyticsData.mostCommonLocation}
                    </div>
                  </div>
                </Card>
              </Col>
            </Row>
          </Card>

        <Card
          style={{
            borderRadius: isXs ? 12 : 18,
            border: `1px solid ${BRAND.soft}`,
            boxShadow: "0 10px 26px rgba(16,24,40,0.06)",
            padding: 0
          }}
        >
          {/* Custom header that stacks on mobile */}
          <div style={{
            padding: isXs ? "12px 12px 0" : screens.sm ? "16px 16px 0" : "20px 20px 0",
            marginBottom: isXs ? 12 : 16,
            display: "flex",
            flexDirection: screens.xs ? "column" : "row",
            justifyContent: "space-between",
            alignItems: screens.xs ? "flex-start" : "center",
            gap: screens.xs ? 12 : 16
          }}>
            <Text strong style={{ color: "#000000ff", fontSize: screens.xs ? 16 : 18 }}>
              All Cases
            </Text>
            
            <Space 
              wrap 
              size={screens.xs ? 6 : 8}
              style={{ width: screens.xs ? "100%" : "auto" }}
            >
              <Input
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={screens.xs ? "Search…" : "Search cases…"}
                prefix={<SearchOutlined />}
                style={{ 
                  width: screens.xs ? "100%" : screens.sm ? 180 : 260, 
                  minWidth: screens.xs ? "100%" : 140,
                  borderRadius: 999 
                }}
              />
              <Select
                value={filterType}
                onChange={setFilterType}
                style={{ 
                  width: screens.xs ? "100%" : screens.sm ? 160 : 200,
                  minWidth: screens.xs ? "100%" : 120
                }}
                dropdownMatchSelectWidth={220}
              >
                <Option value="all">All Cases</Option>
                <Option value="Open">Open</Option>
                <Option value="Under Investigation">In-Progress</Option>
                <Option value="Resolved">Resolved</Option>
                <Option value="Cancelled">Cancelled</Option>
              </Select>
            </Space>
          </div>
          <Table
            rowKey="caseID"
            columns={screens.xs ? columnsMobile : columns}
            dataSource={filteredCases}
            loading={loading}
            pagination={{ 
              pageSize: 10, 
              showSizeChanger: false,
              size: screens.xs ? 'small' : 'default',
              position: ['bottomLeft'],
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} cases`
            }}
            scroll={{
              x: "max-content",
              y: screens.xs ? 420 : screens.sm ? 460 : 520,
            }}
            tableLayout={isMdUp ? "fixed" : "auto"}
            className="pretty-table"
            sortDirections={['descend']}
            size={screens.xs ? 'small' : 'middle'}
            sticky
          />

          {/* Edit / View Modal (kept functional behavior) */}
          <Modal
            title={
              editingCase
                ? `${isViewMode ? "View" : "Edit"} Case • ${editingCase?.caseID}`
                : "Case"
            }
            open={editModalVisible}
            onCancel={() => {
              setEditModalVisible(false);
              setEditingCase(null);
              setIsViewMode(false);
            }}
            okText="Save"
            onOk={() => {
              form.validateFields().then((v) => handleUpdateCase(v));
            }}
            width={screens.md ? 600 : "95%"}
            centered
            styles={{
              body: { 
                maxHeight: screens.xs ? "60vh" : "70vh", 
                overflowY: "auto", 
                padding: screens.xs ? "12px 16px" : "16px 24px" 
              }
            }}
          >
            <Form form={form} layout="vertical" validateTrigger={['onChange', 'onBlur']}>
              <Form.Item
                name="victimName"
                label="Victim Name"
                rules={[
                  { required: true, message: "Victim Name is required" },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      const strValue = String(value).trim();
                      if (/(.)\1{2}/.test(strValue)) {
                        return Promise.reject(new Error('Victim name cannot contain repeated characters'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input 
                  disabled={isViewMode}
                  onChange={() => form.validateFields(['victimName'])}
                  onKeyPress={(e) => {
                    if (/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
              </Form.Item>
              <Form.Item
                name="incidentType"
                label="Incident Type"
                rules={[{ required: true }]}
              >
                <Input disabled={isViewMode} />
              </Form.Item>
              <Form.Item
                name="incidentSubtype"
                label="Incident Subtype"
              >
                <Select 
                  placeholder="Select subtype (auto-detected from description)"
                  disabled={isViewMode}
                  allowClear
                >
                  {editSubtypeOptions.map((subtype) => (
                    <Option key={subtype} value={subtype}>
                      {subtype}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Row gutter={12} style={{ width: "100%" }}>
                <Col xs={24} md={12}>
                  <Form.Item 
                    name="locationPurok" 
                    label="Purok"
                    rules={[
                      {
                        required: true,
                        message: "Please select a purok",
                      },
                    ]}
                  >
                    <Select 
                      placeholder="Select purok"
                      allowClear
                      disabled={isViewMode}
                    >
                      <Option value="Purok 1">Purok 1</Option>
                      <Option value="Purok 2">Purok 2</Option>
                      <Option value="Purok 3">Purok 3</Option>
                      <Option value="Purok 4">Purok 4</Option>
                      <Option value="Purok 5">Purok 5</Option>
                      <Option value="Purok 6">Purok 6</Option>
                      <Option value="Purok 7">Purok 7</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item 
                    name="locationAddress" 
                    label="Barangay/Municipality/Province"
                    initialValue="Bonfal Proper, Bayombong, Nueva Vizcaya"
                  >
                    <Input disabled />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="location" hidden><Input type="hidden" /></Form.Item>
              <Form.Item 
                name="description" 
                label="Description"
                rules={[
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      const strValue = String(value).trim();
                      if (/(.)\1{2}/.test(strValue)) {
                        return Promise.reject(new Error('Description cannot contain repeated characters'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input.TextArea 
                  rows={3} 
                  disabled={isViewMode}
                  onChange={() => form.validateFields(['description'])}
                />
              </Form.Item>
              <Form.Item 
                name="perpetrator" 
                label="Perpetrator"
                rules={[
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      const strValue = String(value).trim();
                      if (/(.)\1{2}/.test(strValue)) {
                        return Promise.reject(new Error('Perpetrator name cannot contain repeated characters'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input 
                  disabled={isViewMode}
                  onChange={() => form.validateFields(['perpetrator'])}
                  onKeyPress={(e) => {
                    if (/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
              </Form.Item>
              <Form.Item 
                name="assignedOfficer" 
                label="Assigned Officer"
                rules={[
                  { required: true, message: "Assigned officer is required" },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      const selectedOfficer = barangayOfficials.find(o => o.id === value);
                      if (!selectedOfficer) return Promise.resolve();
                      const officerName = selectedOfficer.name;
                      if (!/^[a-zA-Z\s\-'\.]+$/.test(officerName)) {
                        return Promise.reject(new Error('Assigned officer name must contain only letters, spaces, hyphens, apostrophes, or periods'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Select 
                  disabled={isViewMode}
                  placeholder="Select assigned officer"
                  size="large"
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={barangayOfficials.map((officer) => ({
                    value: officer.id,
                    label: officer.name,
                  }))}
                />
              </Form.Item>
              <Form.Item name="riskLevel" label="Risk Level">
                <Select disabled={isViewMode}>
                  <Option value="Low">Low</Option>
                  <Option value="Medium">Medium</Option>
                  <Option value="High">High</Option>
                </Select>
              </Form.Item>
              <Form.Item name="status" label="Status">
                <Select disabled={isViewMode}>
                  <Option value="Open">Open</Option>
                  <Option value="Under Investigation">In-Progress</Option>
                  <Option value="Resolved">Resolved</Option>
                  <Option value="Cancelled">Cancelled</Option>
                </Select>
              </Form.Item>
            </Form>
          </Modal>

          {/* Add Case Modal */}
          <Modal
            title={
              <div style={{ 
                padding: "8px 0", 
                borderBottom: `1px solid ${BRAND.soft}`,
                marginBottom: 16
              }}>
                <Title level={4} style={{ margin: 0, color: BRAND.violet }}>
                  Create New Case
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Add a new case by selecting a report or entering details manually
                </Text>
              </div>
            }
            open={addModalVisible}
            onCancel={() => {
              setAddModalVisible(false);
              setSelectedReport(null);
              addForm.resetFields();
            }}
            footer={[
              <Button
                key="cancel"
                onClick={() => {
                  setAddModalVisible(false);
                  setSelectedReport(null);
                  addForm.resetFields();
                }}
              >
                Cancel
              </Button>,
              <Button
                key="submit"
                type="primary"
                onClick={() => {
                  addForm.validateFields().then((v) => handleCreateCase(v));
                }}
                style={{ background: BRAND.violet, borderColor: BRAND.violet }}
              >
                Create Case
              </Button>,
            ]}
            width={screens.md ? 800 : "95%"}
            centered
            styles={{
              body: { 
                maxHeight: screens.xs ? "60vh" : "70vh", 
                overflowY: "auto", 
                padding: screens.xs ? "12px 16px" : "16px 24px" 
              }
            }}
          >
            <Form form={addForm} layout="vertical" validateTrigger={['onChange', 'onBlur']}>
              {/* Report Selection Section */}
              <Card 
                size="small" 
                style={{ 
                  background: "#f9f7ff", 
                  border: `1px solid ${BRAND.soft}`,
                  marginBottom: screens.xs ? 12 : 16,
                  borderRadius: 8,
                  padding: screens.xs ? "8px 12px" : undefined
                }}
                bodyStyle={{ 
                  padding: screens.xs ? 8 : undefined 
                }}
              >
                <Form.Item
                  name="reportID"
                  label={<Text strong>Link to Existing Report (Optional)</Text>}
                  help={<Text type="secondary" style={{ fontSize: 12 }}>Select a report to auto-fill case details, or leave blank for manual entry</Text>}
                >
                  <Select
                    showSearch
                    placeholder="Search and select a report..."
                    onChange={handleReportSelect}
                    // search against the label (string) so users can type reportID, incident type, or victim name
                    optionFilterProp="label"
                    optionLabelProp="label"
                    allowClear
                    size="large"
                    filterOption={(input, option) => {
                      if (!option?.label) return false;
                      return String(option.label).toLowerCase().includes(String(input).toLowerCase());
                    }}
                  >
                    {reportsList.map((r) => {
                      const victimName = r.victim ? `${r.victim.firstName || ""} ${r.victim.lastName || ""}`.trim() : "";
                      const label = `${r.reportID} ${r.incidentType || ""} ${victimName}`.trim();
                      return (
                        <Option key={r.reportID} value={r.reportID} label={label}>
                          <Space direction="vertical" size={0}>
                            <Text strong>{r.reportID}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {r.incidentType} • {r.victim?.firstName || ""} {r.victim?.lastName || ""}
                            </Text>
                          </Space>
                        </Option>
                      );
                    })}
                  </Select>
                </Form.Item>
              </Card>

              <Divider orientation="left" style={{ 
                color: BRAND.violet,
                margin: screens.xs ? "12px 0" : "24px 0"
              }}>
                Case Information
              </Divider>

              {/* Case ID and Status Row */}
              <Row gutter={screens.xs ? 8 : 16}>
                <Col xs={24} md={12}>
                  <Form.Item 
                    name="caseID" 
                    label={<Text strong>Case ID</Text>}
                    rules={[{ required: true, message: "Case ID is required" }]}
                  >
                    <Input 
                      placeholder="e.g., CASE001" 
                      size="large"
                      suffix={
                        <Button 
                          type="primary" 
                          onClick={generateCaseID} 
                          style={{ width: 100, marginRight: -8, background: BRAND.violet }}
                        >
                          Generate
                        </Button>
                      }
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item 
                    name="riskLevel" 
                    label={<Text strong>Risk Level</Text>}
                  >
                    <Select placeholder="Select risk level" size="large">
                      <Option value="Low">
                        <Tag color="green">Low</Tag>
                      </Option>
                      <Option value="Medium">
                        <Tag color="orange">Medium</Tag>
                      </Option>
                      <Option value="High">
                        <Tag color="red">High</Tag>
                      </Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Divider orientation="left" style={{ color: BRAND.violet }}>
                Victim Details
              </Divider>

              {/* Victim Information Row */}
              <Row gutter={16}>
                <Col xs={24} md={16}>
                  <Form.Item
                    name="victimName"
                    label={<Text strong>Victim Name</Text>}
                    rules={[
                      { required: true, message: "Victim name is required" },
                      {
                        validator: (_, value) => {
                          if (!value) return Promise.resolve();
                          const strValue = String(value).trim();
                          if (/(.)\1{2}/.test(strValue)) {
                            return Promise.reject(new Error('Victim name cannot contain repeated characters'));
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}
                  >
                    <Input 
                      placeholder="Enter victim's full name" 
                      size="large"
                      onChange={() => addForm.validateFields(['victimName'])}
                      onKeyPress={(e) => {
                        if (/[0-9]/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item 
                    name="victimType" 
                    label={<Text strong>Victim Type</Text>}
                  >
                    <Select placeholder="Select type" size="large" allowClear>
                      <Option value="child">Child</Option>
                      <Option value="woman">Woman</Option>
                      <Option value="anonymous">Anonymous</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              {/* Birthdate and Age fields - show for all victim types */}
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item 
                    name="victimBirthdate" 
                    label={<Text strong>Birthdate</Text>}
                  >
                    <DatePicker 
                      placeholder="Select birthdate" 
                      size="large"
                      disabledDate={(current) => {
                        // Disable future dates
                        return current && current > dayjs().endOf('day');
                      }}
                      onChange={(date) => {
                        if (date) {
                          const age = calculateAge(date);
                          addForm.setFieldsValue({ victimAge: age });
                        } else {
                          addForm.setFieldsValue({ victimAge: undefined });
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item 
                    name="victimAge" 
                    label={<Text strong>Age</Text>}
                  >
                    <Input 
                      type="number" 
                      placeholder="Age" 
                      size="large"
                      min={0}
                      max={150}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* Gender field - only show for children */}
              {addForm.getFieldValue('victimType') === 'child' && (
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item 
                      name="victimGender" 
                      label={<Text strong>Gender</Text>}
                    >
                      <Select placeholder="Select gender" size="large" allowClear>
                        <Option value="male">Male</Option>
                        <Option value="female">Female</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
              )}

              <Divider orientation="left" style={{ color: BRAND.violet }}>
                Incident Details
              </Divider>

              {/* Incident Type and Location Row */}
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="incidentType"
                    label={<Text strong>Incident Type</Text>}
                    rules={[{ required: true, message: "Incident type is required" }]}
                  >
                    <Select 
                      placeholder="Select incident type" 
                      size="large"
                      onChange={(value) => {
                        // Update available subtypes when incident type changes
                        const subtypes = getSubtypesForIncident(value);
                        setAddSubtypeOptions(subtypes);
                        // Reset subtype to first available option
                        addForm.setFieldsValue({ incidentSubtype: subtypes[0] });
                      }}
                    >
                      <Option value="Economic">Economic Abuse</Option>
                      <Option value="Psychological">Psychological Abuse</Option>
                      <Option value="Physical">Physical Abuse</Option>
                      <Option value="Sexual">Sexual Abuse</Option>
                      <Option value="Others">Others</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="incidentSubtype"
                    label={<Text strong>Incident Subtype</Text>}
                    help="Auto-detected from description or select manually"
                  >
                    <Select 
                      placeholder="Select subtype" 
                      allowClear
                      options={addSubtypeOptions.map(subtype => ({
                        value: subtype,
                        label: subtype
                      }))}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* Location Row */}
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item 
                    name="locationPurok" 
                    label={<Text strong>Purok</Text>}
                    rules={[
                      {
                        required: true,
                        message: "Please select a purok",
                      },
                    ]}
                  >
                    <Select 
                      placeholder="Select purok"
                      allowClear
                      size="large"
                    >
                      <Option value="Purok 1">Purok 1</Option>
                      <Option value="Purok 2">Purok 2</Option>
                      <Option value="Purok 3">Purok 3</Option>
                      <Option value="Purok 4">Purok 4</Option>
                      <Option value="Purok 5">Purok 5</Option>
                      <Option value="Purok 6">Purok 6</Option>
                      <Option value="Purok 7">Purok 7</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item 
                    name="locationAddress" 
                    label={<Text strong>Barangay/Municipality/Province</Text>}
                    initialValue="Bonfal Proper, Bayombong, Nueva Vizcaya"
                  >
                    <Input disabled size="large" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="location" hidden><Input type="hidden" /></Form.Item>

              {/* Date Reported */}
              <Form.Item 
                name="dateReported" 
                label={<Text strong>Date & Time Reported</Text>}
              >
                <DatePicker 
                  showTime
                  format="YYYY-MM-DD hh:mm:ss A"
                  size="large"
                  placeholder="Select date and time"
                  inputReadOnly
                />
              </Form.Item>

              {/* Description */}
              <Form.Item
                name="description"
                label={<Text strong>Description</Text>}
                rules={[
                  { required: true, message: "Description is required" },
                  {
                    validator: (_, value) => {
                      if (!value) return Promise.resolve();
                      const strValue = String(value).trim();
                      if (/(.)\1{2}/.test(strValue)) {
                        return Promise.reject(new Error('Description cannot contain repeated characters'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <Input.TextArea 
                  rows={4} 
                  placeholder="Provide detailed description of the incident..."
                  style={{ borderRadius: 8 }}
                  onChange={(e) => {
                    addForm.validateFields(['description']);
                    // Auto-detect subtype based on description
                    const incidentType = addForm.getFieldValue('incidentType');
                    const detectedSubtype = detectSubtypeFromDescription(e.target.value, incidentType);
                    addForm.setFieldsValue({ incidentSubtype: detectedSubtype });
                  }}
                />
              </Form.Item>

              {/* Perpetrator and Assigned Officer Row */}
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item 
                    name="perpetrator" 
                    label={<Text strong>Perpetrator</Text>}
                    rules={[
                      {
                        validator: (_, value) => {
                          if (!value) return Promise.resolve();
                          const strValue = String(value).trim();
                          if (/(.)\1{2}/.test(strValue)) {
                            return Promise.reject(new Error('Perpetrator name cannot contain repeated characters'));
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}
                  >
                    <Input 
                      placeholder="Enter perpetrator's name (if known)" 
                      size="large"
                      onChange={() => addForm.validateFields(['perpetrator'])}
                      onKeyPress={(e) => {
                        if (/[0-9]/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="assignedOfficer"
                    label={<Text strong>Assigned Officer</Text>}
                    rules={[
                      { required: true, message: "Assigned officer is required" },
                      {
                        validator: (_, value) => {
                          if (!value) return Promise.resolve();
                          const selectedOfficer = barangayOfficials.find(o => o.id === value);
                          if (!selectedOfficer) return Promise.resolve();
                          const officerName = selectedOfficer.name;
                          if (!/^[a-zA-Z\s\-'\.]+$/.test(officerName)) {
                            return Promise.reject(new Error('Assigned officer name must contain only letters, spaces, hyphens, apostrophes, or periods'));
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}
                  >
                    <Select 
                      placeholder="Select assigned officer"
                      size="large"
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={barangayOfficials.map((officer) => ({
                        value: officer.id,
                        label: officer.name,
                      }))}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="status" hidden>
                <Input type="hidden" />
              </Form.Item>
            </Form>
          </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          title={
            <Space>
              <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
              <span>Confirm Delete</span>
            </Space>
          }
          open={deleteModalOpen}
          onCancel={() => {
            setDeleteModalOpen(false);
            setCaseToDelete(null);
          }}
          onOk={() => handleDeleteCase(caseToDelete)}
          okText="Yes, Delete"
          cancelText="Cancel"
          okButtonProps={{ danger: true, loading }}
          centered
        >
          <div style={{ padding: '12px 0' }}>
            <p style={{ fontSize: 15, marginBottom: 8 }}>
              Are you sure you want to delete this case?
            </p>
            {caseToDelete && (
              <div style={{ 
                background: '#f5f5f5', 
                padding: 12, 
                borderRadius: 8,
                marginTop: 12 
              }}>
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>Case ID: {caseToDelete.caseID}</Text>
                    <Tag color={
                      caseToDelete.status === 'Closed' ? 'green' :
                      caseToDelete.status === 'In Progress' ? 'blue' :
                      caseToDelete.status === 'Under Investigation' ? 'orange' :
                      'default'
                    }>
                      {caseToDelete.status}
                    </Tag>
                  </div>
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    Type: {caseToDelete.incidentType}
                  </Text>
                  {caseToDelete.location && (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Location: {caseToDelete.location}
                    </Text>
                  )}
                  {caseToDelete.assignedOfficer && (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Assigned Officer: {caseToDelete.assignedOfficer}
                    </Text>
                  )}
                  {caseToDelete.riskLevel && (
                    <div style={{ marginTop: 4 }}>
                      <Tag color={
                        caseToDelete.riskLevel === 'High' ? 'red' :
                        caseToDelete.riskLevel === 'Medium' ? 'orange' :
                        'green'
                      }>
                        Risk: {caseToDelete.riskLevel}
                      </Tag>
                    </div>
                  )}
                </Space>
              </div>
            )}
            <p style={{ marginTop: 16, marginBottom: 0, color: '#666', fontSize: 13 }}>
              This action cannot be undone. The case will be permanently removed from the system.
            </p>
          </div>
        </Modal>

        {/* Combined Export Modal */}
        <Modal
          title={
            <div style={{ padding: "8px 0" }}>
              <Title level={4} style={{ margin: 0, color: BRAND.violet}}>
                <DownloadOutlined style={{ marginRight: 8 }} />
                Export Cases
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Choose export format and select cases to download
              </Text>
            </div>
          }
          open={exportModalVisible}
          onCancel={() => {
            setExportModalVisible(false);
            setSelectedOfficer("");
            setExportFilters({ purok: "", status: "", riskLevel: "", incidentType: "", subtype: "", victimType: "", year: "", month: "", week: "" });
            setSelectedCases([]);
            setExportType("csv");
          }}
          footer={[
            <Button
              key="cancel"
              onClick={() => {
                setExportModalVisible(false);
                setSelectedOfficer("");
                setSelectedVictim("");
                setExportFilters({ purok: "", status: "", riskLevel: "", incidentType: "", subtype: "", victimType: "", year: "", month: "", week: "" });
                setSelectedCases([]);
                setExportType("csv");
                setExportMode("officer");
              }}
            >
              Cancel
            </Button>,
            (exportMode === "all" || selectedOfficer || selectedVictim) && (
              <Button
                key="export-csv"
                icon={<DownloadOutlined />}
                onClick={() => {
                  if (exportMode === "all") {
                    handleExportAllCSV();
                  } else if (exportMode === "officer") {
                    handleExportOfficerCases(selectedOfficer);
                  } else {
                    handleExportVictimCases(selectedVictim);
                  }
                }}
                style={{ background: BRAND.violet, borderColor: BRAND.violet, color: '#fff' }}
              >
                Excel ({exportMode === "all" ? getFilteredAllCasesCount() : getFilteredCaseCount()})
              </Button>
            ),
            (selectedOfficer || selectedVictim) && (
              <Button
                key="export-pdf"
                type="primary"
                icon={<FilePdfOutlined />}
                onClick={handleExportPDF}
                disabled={selectedCases.length === 0}
                loading={exportLoading}
                style={{ background: BRAND.pink, borderColor: BRAND.pink }}
              >
                PDF ({selectedCases.length})
              </Button>
            ),
          ]}
          width={screens.xs ? "80vw" : screens.sm ? "65vw" : screens.md ? ((selectedOfficer || selectedVictim) ? 850 : 450) : ((selectedOfficer || selectedVictim) ? 950 : 500)}
          centered={true}
          style={{
            top: screens.xs ? 20 : 0,
            paddingBottom: 0
          }}
          styles={{
            body: { 
              padding: 0,
              maxHeight: '70vh',
              overflowY: 'auto',
              overflowX: 'hidden'
            },
            mask: {
              backdropFilter: 'blur(4px)'
            }
          }}
          maskClosable={false}
        >
          <div style={{ 
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Side-by-side layout */}
            <Row gutter={screens.xs ? 0 : 16} style={{ 
              margin: 0,
              flexDirection: screens.xs && (selectedOfficer || selectedVictim) ? 'column' : 'row'
            }}>
              {/* Left side - Selection & Filters */}
              <Col xs={24} md={(selectedOfficer || selectedVictim) ? 10 : 24} style={{
                padding: screens.xs ? '12px 16px' : screens.sm ? '14px 12px' : '16px 20px',
                borderRight: screens.xs ? 'none' : (selectedOfficer || selectedVictim) ? `1px solid ${BRAND.soft}` : 'none',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0
              }}>
                <Form layout="vertical">
                {/* Export Mode Radio Selection - Show all options initially, only selected when officer/victim is chosen */}
                {!(selectedOfficer || selectedVictim) ? (
                  <Form.Item
                    label={<Text strong style={{ fontSize: 15 }}>Export Cases By</Text>}
                    style={{ marginBottom: 12 }}
                  >
                    <Radio.Group 
                      value={exportMode} 
                      onChange={(e) => {
                        setExportMode(e.target.value);
                        setSelectedOfficer("");
                        setSelectedVictim("");
                        setExportFilters({ purok: "", status: "", riskLevel: "", incidentType: "", subtype: "", victimType: "", year: "", month: "", week: "" });
                        setSelectedCases([]);
                      }}
                      style={{ width: '100%' }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }} size={8}>
                        <Radio value="all" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: exportMode === 'all' ? `2px solid ${BRAND.violet}` : '1px solid #d9d9d9', background: exportMode === 'all' ? BRAND.soft : '#fff' }}>
                          <Text strong>All Cases</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>Export all cases (includes remarks)</Text>
                        </Radio>
                        <Radio value="officer" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: exportMode === 'officer' ? `2px solid ${BRAND.violet}` : '1px solid #d9d9d9', background: exportMode === 'officer' ? BRAND.soft : '#fff' }}>
                          <Text strong>Assigned Officer</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>Export cases assigned to a specific officer</Text>
                        </Radio>
                        <Radio value="victim" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: exportMode === 'victim' ? `2px solid ${BRAND.violet}` : '1px solid #d9d9d9', background: exportMode === 'victim' ? BRAND.soft : '#fff' }}>
                          <Text strong>Victim Name</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>Export all cases for a specific victim</Text>
                        </Radio>
                      </Space>
                    </Radio.Group>
                  </Form.Item>
                ) : (
                  <div style={{ marginBottom: 12 }}>
                    <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 6 }}>Export Cases By</Text>
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: 8,
                      border: `2px solid ${BRAND.violet}`,
                      background: BRAND.soft
                    }}>
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                            border: `2px solid ${BRAND.violet}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <div style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: BRAND.violet
                            }} />
                          </div>
                          <Text strong style={{ fontSize: 15 }}>
                            {exportMode === 'officer' ? 'Assigned Officer' : 'Victim Name'}
                          </Text>
                        </div>
                        <Text type="secondary" style={{ fontSize: 12, paddingLeft: 24 }}>
                          {exportMode === 'officer' 
                            ? 'Export cases assigned to a specific officer'
                            : 'Export all cases for a specific victim'
                          }
                        </Text>
                      </Space>
                    </div>
                  </div>
                )}

                {/* Officer Selection */}
                {exportMode === "officer" && (
                  <Form.Item
                    label={<Text strong style={{ fontSize: 15 }}>Select Assigned Officer</Text>}
                    help={
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        Choose an officer to export their assigned cases
                      </Text>
                    }
                    style={{ marginBottom: 10}}
                  >
                    <Select
                      showSearch
                      placeholder="Search and select an officer..."
                      value={selectedOfficer}
                      onChange={(value) => {
                        setSelectedOfficer(value);
                        // Reset victim selection when officer changes
                        setSelectedVictim("");
                      }}
                      size="middle"
                      style={{ width: "100%" }}
                      filterOption={(input, option) =>
                        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                      }
                      options={getUniqueOfficers().map(officer => ({
                        value: officer,
                        label: officer,
                      }))}
                    />
                  </Form.Item>
                )}

                {/* Victim Selection - shows in both modes but filtered by officer when in officer mode */}
                {((exportMode === "officer" && selectedOfficer) || exportMode === "victim") && (
                  <Form.Item
                    label={<Text strong style={{ fontSize: 15 }}>
                      {exportMode === "officer" ? "Filter by Victim (Optional)" : "Select Victim"}
                    </Text>}
                    help={
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {exportMode === "officer" 
                          ? "Narrow down to specific victim's cases handled by this officer"
                          : "Choose a victim to export all their cases"
                        }
                      </Text>
                    }
                    style={{ marginBottom: 10}}
                  >
                    <Select
                      showSearch
                      placeholder="Search and select a victim..."
                      value={selectedVictim}
                      onChange={setSelectedVictim}
                      size="middle"
                      style={{ width: "100%" }}
                      allowClear
                      filterOption={(input, option) =>
                        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                      }
                      options={getUniqueVictims(exportMode === "officer" ? selectedOfficer : null).map(victim => ({
                        value: victim.name,
                        label: victim.name,
                      }))}
                    />
                  </Form.Item>
                )}

                {/* Date Filters - Only for "All Cases" mode */}
                {exportMode === "all" && (
                  <>
                    <Divider orientation="left" style={{ 
                      color: BRAND.violet,
                      margin: "8px 0 8px 0",
                      fontSize: 14
                    }}>
                      Date Range Filters (Optional)
                    </Divider>

                    <Row gutter={[8, 8]}>
                      <Col xs={24}>
                        <Form.Item
                          label={<Text strong style={{ fontSize: 15 }}>Year</Text>}
                          style={{ marginBottom: 8 }}
                          help={<Text type="secondary" style={{ fontSize: 12 }}>Available years: {getAvailableYears().length > 0 ? getAvailableYears().join(", ") : "No years available"}</Text>}
                        >
                          <Select
                            placeholder="All Years"
                            value={exportFilters.year}
                            onChange={(val) => setExportFilters({ ...exportFilters, year: val, month: "", week: "" })}
                            allowClear
                            size="middle"
                            style={{ width: "100%" }}
                            options={[
                              { value: "", label: "All Years" },
                              ...getAvailableYears().map(year => ({
                                value: year.toString(),
                                label: year.toString(),
                              }))
                            ]}
                          />
                        </Form.Item>
                      </Col>

                      {exportFilters.year && (
                        <Col xs={24}>
                          <Form.Item
                            label={<Text strong style={{ fontSize: 15 }}>Month</Text>}
                            style={{ marginBottom: 8 }}
                            help={<Text type="secondary" style={{ fontSize: 12 }}>Available months for {exportFilters.year}: {getAvailableMonths(exportFilters.year).length > 0 ? getAvailableMonths(exportFilters.year).map(m => ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][m]).join(", ") : "No months available"}</Text>}
                          >
                            <Select
                              placeholder="All Months"
                              value={exportFilters.month}
                              onChange={(val) => setExportFilters({ ...exportFilters, month: val, week: "" })}
                              allowClear
                              size="middle"
                              style={{ width: "100%" }}
                              options={[
                                { value: "", label: "All Months" },
                                ...getAvailableMonths(exportFilters.year).map(monthIdx => {
                                  const monthNames = ["January", "February", "March", "April", "May", "June",
                                    "July", "August", "September", "October", "November", "December"];
                                  return {
                                    value: monthIdx.toString(),
                                    label: monthNames[monthIdx],
                                  };
                                })
                              ]}
                            />
                          </Form.Item>
                        </Col>
                      )}

                      {exportFilters.year && exportFilters.month && (
                        <Col xs={24}>
                          <Form.Item
                            label={<Text strong style={{ fontSize: 15 }}>Week of Month</Text>}
                            style={{ marginBottom: 8 }}
                            help={<Text type="secondary" style={{ fontSize: 12 }}>Available weeks: {getAvailableWeeks(exportFilters.year, exportFilters.month).length > 0 ? getAvailableWeeks(exportFilters.year, exportFilters.month).map(w => `Week ${w}`).join(", ") : "No weeks available"}</Text>}
                          >
                            <Select
                              placeholder="All Weeks"
                              value={exportFilters.week}
                              onChange={(val) => setExportFilters({ ...exportFilters, week: val })}
                              allowClear
                              size="middle"
                              style={{ width: "100%" }}
                              options={[
                                { value: "", label: "All Weeks" },
                                ...getAvailableWeeks(exportFilters.year, exportFilters.month).map(weekNum => ({
                                  value: weekNum.toString(),
                                  label: `Week ${weekNum}`,
                                }))
                              ]}
                            />
                          </Form.Item>
                        </Col>
                      )}
                    </Row>
                  </>
                )}

              {(selectedOfficer || selectedVictim) && (
                <>
                  <Divider orientation="left" style={{ 
                    color: BRAND.violet,
                    margin: "12px 0 10px 0",
                    fontSize: 14
                  }}>
                    Additional Filters (Optional)
                  </Divider>

                  <Row gutter={[8, 8]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label={<Text strong style={{ fontSize: 13 }}>Purok</Text>}
                    style={{ marginBottom: 8 }}
                  >
                    <Select
                      showSearch
                      placeholder="All Puroks"
                      value={exportFilters.purok}
                      onChange={(val) => setExportFilters({ ...exportFilters, purok: val })}
                      allowClear
                      size="middle"
                      style={{ width: "100%" }}
                      filterOption={(input, option) =>
                        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                      }
                      options={[
                        { value: "", label: "All Puroks" },
                        ...getUniquePuroks().map(purok => ({
                          value: purok,
                          label: purok,
                        }))
                      ]}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    label={<Text strong style={{ fontSize: 13 }}>Status</Text>}
                    style={{ marginBottom: 8 }}
                  >
                    <Select
                      placeholder="All Statuses"
                      value={exportFilters.status}
                      onChange={(val) => setExportFilters({ ...exportFilters, status: val })}
                      allowClear
                      size="middle"
                      style={{ width: "100%" }}
                      options={[
                        { value: "", label: "All Statuses" },
                        { value: "Open", label: <><Tag color="orange">Open</Tag></> },
                        { value: "Under Investigation", label: <><Tag color="geekblue">In-Progress</Tag></> },
                        { value: "Resolved", label: <><Tag color="green">Resolved</Tag></> },
                        { value: "Cancelled", label: <><Tag color="default">Cancelled</Tag></> },
                      ]}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    label={<Text strong style={{ fontSize: 13 }}>Risk Level</Text>}
                    style={{ marginBottom: 8 }}
                  >
                    <Select
                      placeholder="All Risk Levels"
                      value={exportFilters.riskLevel}
                      onChange={(val) => setExportFilters({ ...exportFilters, riskLevel: val })}
                      allowClear
                      size="middle"
                      style={{ width: "100%" }}
                      options={[
                        { value: "", label: "All Risk Levels" },
                        { value: "Low", label: <><Tag color="gold">Low</Tag></> },
                        { value: "Medium", label: <><Tag color="volcano">Medium</Tag></> },
                        { value: "High", label: <><Tag color="magenta">High</Tag></> },
                      ]}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    label={<Text strong style={{ fontSize: 13 }}>Incident Type</Text>}
                    style={{ marginBottom: 8 }}
                  >
                    <Select
                      showSearch
                      placeholder="All Incident Types"
                      value={exportFilters.incidentType}
                      onChange={(val) => {
                        setExportFilters({ ...exportFilters, incidentType: val, subtype: "" });
                      }}
                      allowClear
                      size="middle"
                      style={{ width: "100%" }}
                      filterOption={(input, option) =>
                        (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                      }
                      options={[
                        { value: "", label: "All Incident Types" },
                        ...getUniqueIncidentTypes().map(type => ({
                          value: type,
                          label: type,
                        }))
                      ]}
                    />
                  </Form.Item>
                </Col>

                {exportFilters.incidentType && (
                  <Col xs={24}>
                    <Form.Item
                      label={<Text strong style={{ fontSize: 13 }}>Subtype</Text>}
                      style={{ marginBottom: 8 }}
                    >
                      <Select
                        showSearch
                        placeholder="All Subtypes"
                        value={exportFilters.subtype}
                        onChange={(val) => setExportFilters({ ...exportFilters, subtype: val })}
                        allowClear
                        size="middle"
                        style={{ width: "100%" }}
                        filterOption={(input, option) =>
                          (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                        }
                        options={[
                          { value: "", label: "All Subtypes" },
                          ...getSubtypesForIncident(exportFilters.incidentType).map(subtype => ({
                            value: subtype,
                            label: subtype,
                          }))
                        ]}
                      />
                    </Form.Item>
                  </Col>
                )}

                <Col xs={24} sm={12}>
                  <Form.Item
                    label={<Text strong style={{ fontSize: 13 }}>Victim Type</Text>}
                    style={{ marginBottom: 8 }}
                  >
                    <Select
                      placeholder="All Victim Types"
                      value={exportFilters.victimType}
                      onChange={(val) => setExportFilters({ ...exportFilters, victimType: val })}
                      allowClear
                      size="middle"
                      style={{ width: "100%" }}
                      options={[
                        { value: "", label: "All Victim Types" },
                        { value: "child", label: "Child" },
                        { value: "woman", label: "Woman" },
                        { value: "anonymous", label: "Anonymous" },
                      ]}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    label={<Text strong style={{ fontSize: 13 }}>Year</Text>}
                    style={{ marginBottom: 8 }}
                  >
                    <Select
                      placeholder="All Years"
                      value={exportFilters.year}
                      onChange={(val) => setExportFilters({ ...exportFilters, year: val, month: "", week: "" })}
                      allowClear
                      size="middle"
                      style={{ width: "100%" }}
                      options={[
                        { value: "", label: "All Years" },
                        ...getAvailableYears().map(year => ({
                          value: year.toString(),
                          label: year.toString(),
                        }))
                      ]}
                    />
                  </Form.Item>
                </Col>

                {exportFilters.year && (
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={<Text strong style={{ fontSize: 13 }}>Month</Text>}
                      style={{ marginBottom: 8 }}
                    >
                      <Select
                        placeholder="All Months"
                        value={exportFilters.month}
                        onChange={(val) => setExportFilters({ ...exportFilters, month: val, week: "" })}
                        allowClear
                        size="middle"
                        style={{ width: "100%" }}
                        options={[
                          { value: "", label: "All Months" },
                          ...getAvailableMonths(exportFilters.year).map(monthIdx => {
                            const monthNames = ["January", "February", "March", "April", "May", "June",
                              "July", "August", "September", "October", "November", "December"];
                            return {
                              value: monthIdx.toString(),
                              label: monthNames[monthIdx],
                            };
                          })
                        ]}
                      />
                    </Form.Item>
                  </Col>
                )}

                {exportFilters.year && exportFilters.month && (
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={<Text strong style={{ fontSize: 13 }}>Week</Text>}
                      style={{ marginBottom: 8 }}
                    >
                      <Select
                        placeholder="All Weeks"
                        value={exportFilters.week}
                        onChange={(val) => setExportFilters({ ...exportFilters, week: val })}
                        allowClear
                        size="middle"
                        style={{ width: "100%" }}
                        options={[
                          { value: "", label: "All Weeks" },
                          ...getAvailableWeeks(exportFilters.year, exportFilters.month).map(weekNum => ({
                            value: weekNum.toString(),
                            label: `Week ${weekNum}`,
                          }))
                        ]}
                      />
                    </Form.Item>
                  </Col>
                )}
              </Row>

              {((selectedOfficer || selectedVictim) || (exportMode === "all")) && (
                <div style={{
                  background: "#f9f7ff",
                  border: `1px solid ${BRAND.soft}`,
                  borderRadius: 8,
                  padding: 12,
                  marginTop: 12
                }}>
                  <Space direction="vertical" size={4} style={{ width: "100%" }}>
                    <Text strong style={{ color: BRAND.violet, fontSize: 15 }}>
                      Export Preview
                    </Text>
                    <Row gutter={[8, 4]}>
                      {exportMode === "all" && (
                        <>
                          <Col span={12}>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              Mode:
                            </Text>
                          </Col>
                          <Col span={12}>
                            <Text strong style={{ fontSize: 13 }}>All Cases (Includes Remarks)</Text>
                          </Col>
                        </>
                      )}

                      {exportMode === "officer" && (
                        <>
                          <Col span={12}>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              Officer:
                            </Text>
                          </Col>
                          <Col span={12}>
                            <Text strong style={{ fontSize: 13 }}>{selectedOfficer}</Text>
                          </Col>
                        </>
                      )}

                      {selectedVictim && (
                        <>
                          <Col span={12}>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              Victim:
                            </Text>
                          </Col>
                          <Col span={12}>
                            <Text strong style={{ fontSize: 13 }}>{selectedVictim}</Text>
                          </Col>
                        </>
                      )}

                      {exportMode === "victim" && !selectedVictim && (
                        <>
                          <Col span={12}>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              Victim:
                            </Text>
                          </Col>
                          <Col span={12}>
                            <Text strong style={{ fontSize: 13 }}>Not selected</Text>
                          </Col>
                        </>
                      )}

                      {exportFilters.purok && (
                        <>
                          <Col span={12}>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              Purok:
                            </Text>
                          </Col>
                          <Col span={12}>
                            <Text strong style={{ fontSize: 13 }}>{exportFilters.purok}</Text>
                          </Col>
                        </>
                      )}

                      {exportFilters.status && (
                        <>
                          <Col span={12}>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              Status:
                            </Text>
                          </Col>
                          <Col span={12}>
                            <Tag color={statusColor(exportFilters.status)} style={{ borderRadius: 999, fontSize: 12, padding: '2px 10px' }}>
                              {exportFilters.status}
                            </Tag>
                          </Col>
                        </>
                      )}

                      {exportFilters.riskLevel && (
                        <>
                          <Col span={12}>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              Risk Level:
                            </Text>
                          </Col>
                          <Col span={12}>
                            <Tag color={riskColor(exportFilters.riskLevel)} style={{ borderRadius: 999, fontSize: 12, padding: '2px 10px' }}>
                              {exportFilters.riskLevel}
                            </Tag>
                          </Col>
                        </>
                      )}

                      {exportFilters.incidentType && (
                        <>
                          <Col span={12}>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              Incident Type:
                            </Text>
                          </Col>
                          <Col span={12}>
                            <Text strong style={{ fontSize: 13 }}>{exportFilters.incidentType}</Text>
                          </Col>
                        </>
                      )}

                      {exportFilters.victimType && (
                        <>
                          <Col span={12}>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              Victim Type:
                            </Text>
                          </Col>
                          <Col span={12}>
                            <Text strong style={{ fontSize: 13 }}>
                              {exportFilters.victimType.charAt(0).toUpperCase() + exportFilters.victimType.slice(1)}
                            </Text>
                          </Col>
                        </>
                      )}

                      {exportFilters.year && (
                        <>
                          <Col span={12}>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              Year:
                            </Text>
                          </Col>
                          <Col span={12}>
                            <Text strong style={{ fontSize: 13 }}>{exportFilters.year}</Text>
                          </Col>
                        </>
                      )}

                      {exportFilters.month && (
                        <>
                          <Col span={12}>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              Month:
                            </Text>
                          </Col>
                          <Col span={12}>
                            <Text strong style={{ fontSize: 13 }}>
                              {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][parseInt(exportFilters.month)]}
                            </Text>
                          </Col>
                        </>
                      )}

                      {exportFilters.week && (
                        <>
                          <Col span={12}>
                            <Text type="secondary" style={{ fontSize: 13 }}>
                              Week:
                            </Text>
                          </Col>
                          <Col span={12}>
                            <Text strong style={{ fontSize: 13 }}>Week {exportFilters.week}</Text>
                          </Col>
                        </>
                      )}

                      <Col span={24}>
                        <Divider style={{ margin: "6px 0" }} />
                      </Col>

                      <Col span={12}>
                        <Text strong style={{ fontSize: 14, color: BRAND.violet }}>
                          Cases to Export:
                        </Text>
                      </Col>
                      <Col span={12}>
                        <Text strong style={{ fontSize: 16, color: BRAND.violet }}>
                          {getFilteredCaseCount()}
                        </Text>
                      </Col>
                    </Row>
                  </Space>
                </div>
              )}
                </>
              )}
                </Form>
              </Col>

              {/* Right side - Case List (shown when officer or victim selected) */}
              {(selectedOfficer || selectedVictim) && (
                <Col xs={24} md={14} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: screens.xs ? '12px 16px 16px 16px' : screens.sm ? '14px 12px' : '16px 20px',
                  borderTop: screens.xs ? `2px solid ${BRAND.soft}` : 'none',
                  marginTop: screens.xs ? 8 : 0
                }}>
                  <div style={{
                    background: '#fafafa',
                    borderRadius: screens.xs ? 8 : 12,
                    padding: screens.xs ? 12 : 16,
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: `2px solid ${BRAND.soft}`,
                    overflow: 'hidden'
                  }}>
                    {/* Header with selection controls */}
                    <div style={{
                      marginBottom: screens.xs ? 8 : 12,
                      paddingBottom: screens.xs ? 8 : 12,
                      borderBottom: `2px solid ${BRAND.soft}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 8
                    }}>
                      <Space size={screens.xs ? 4 : 8}>
                        <FileTextOutlined style={{ fontSize: screens.xs ? 16 : 18, color: BRAND.violet }} />
                        <Text strong style={{ fontSize: screens.xs ? 13 : 15 }}>
                          {exportMode === "officer" ? "Officer's Cases" : "Victim's Cases"}
                        </Text>
                        {!screens.xs && (
                          <Tag color={BRAND.violet} style={{ borderRadius: 999 }}>
                            {selectedCases.length} of {getFilteredCaseCount()} selected
                          </Tag>
                        )}
                      </Space>
                      {screens.xs && (
                        <Text type="secondary" style={{ fontSize: 11, width: '100%', marginTop: 4 }}>
                          {selectedCases.length} of {getFilteredCaseCount()} selected
                        </Text>
                      )}
                      <Space size={4} wrap>
                        <Button
                          size={screens.xs ? "small" : "small"}
                          icon={!screens.xs ? <CheckSquareOutlined /> : null}
                          onClick={() => {
                            let casesToSelect = [];
                            
                            if (exportMode === "officer") {
                              casesToSelect = allCases.filter(
                                c => c.assignedOfficer && c.assignedOfficer.toLowerCase() === selectedOfficer.toLowerCase()
                              );
                              // If victim is also selected, further filter by victim
                              if (selectedVictim) {
                                casesToSelect = casesToSelect.filter(
                                  c => c.victimName && c.victimName.toLowerCase() === selectedVictim.toLowerCase()
                                );
                              }
                            } else if (exportMode === "victim") {
                              casesToSelect = allCases.filter(
                                c => c.victimName && c.victimName.toLowerCase() === selectedVictim.toLowerCase()
                              );
                            }
                            
                            // Apply filters
                            if (exportFilters.purok) {
                              casesToSelect = casesToSelect.filter(c => 
                                c.location && c.location.toLowerCase().includes(exportFilters.purok.toLowerCase())
                              );
                            }
                            if (exportFilters.status) {
                              casesToSelect = casesToSelect.filter(c => 
                                c.status && c.status.toLowerCase() === exportFilters.status.toLowerCase()
                              );
                            }
                            if (exportFilters.riskLevel) {
                              casesToSelect = casesToSelect.filter(c => 
                                c.riskLevel && c.riskLevel.toLowerCase() === exportFilters.riskLevel.toLowerCase()
                              );
                            }
                            if (exportFilters.incidentType) {
                              casesToSelect = casesToSelect.filter(c => 
                                c.incidentType && c.incidentType.toLowerCase() === exportFilters.incidentType.toLowerCase()
                              );
                            }
                            if (exportFilters.victimType) {
                              casesToSelect = casesToSelect.filter(c => 
                                c.victimType && c.victimType.toLowerCase() === exportFilters.victimType.toLowerCase()
                              );
                            }

                            // Apply date filters
                            if (exportFilters.year) {
                              casesToSelect = casesToSelect.filter(c => {
                                if (!c.createdAt) return false;
                                const date = new Date(c.createdAt);
                                if (date.getFullYear() !== parseInt(exportFilters.year)) return false;
                                
                                if (exportFilters.month !== "") {
                                  if (date.getMonth() !== parseInt(exportFilters.month)) return false;
                                  
                                  if (exportFilters.week !== "") {
                                    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
                                    const weekOfMonth = Math.ceil((date.getDate() + firstDay.getDay()) / 7);
                                    if (weekOfMonth !== parseInt(exportFilters.week)) return false;
                                  }
                                }
                                return true;
                              });
                            }
                            
                            setSelectedCases(casesToSelect.map(c => c.caseID));
                          }}
                          style={{ borderRadius: 8, fontSize: screens.xs ? 11 : 13 }}
                        >
                          {screens.xs ? "All" : "Select All"}
                        </Button>
                        <Button
                          size={screens.xs ? "small" : "small"}
                          icon={!screens.xs ? <CloseCircleOutlined /> : null}
                          onClick={() => setSelectedCases([])}
                          disabled={selectedCases.length === 0}
                          style={{ borderRadius: 8, fontSize: screens.xs ? 11 : 13 }}
                        >
                          Clear
                        </Button>
                      </Space>
                    </div>

                    {/* Case List with Buttons */}
                    <div 
                      className="case-list-scroll"
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: 8,
                        flex: 1,
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        padding: '4px 8px 16px 4px',
                        minHeight: 0
                      }}
                    >
                      {getFilteredCaseCount() === 0 ? (
                        <div style={{ 
                          textAlign: 'center', 
                          padding: '60px 20px',
                          color: '#999'
                        }}>
                          <FileTextOutlined style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 16 }} />
                          <div>
                            <Text type="secondary">No cases available</Text>
                          </div>
                        </div>
                      ) : (
                        (() => {
                          // Get cases with filters applied based on export mode
                          let casesToShow = [];
                          
                          if (exportMode === "officer") {
                            casesToShow = allCases.filter(
                              c => c.assignedOfficer && c.assignedOfficer.toLowerCase() === selectedOfficer.toLowerCase()
                            );
                            // If victim is also selected, further filter by victim
                            if (selectedVictim) {
                              casesToShow = casesToShow.filter(
                                c => c.victimName && c.victimName.toLowerCase() === selectedVictim.toLowerCase()
                              );
                            }
                          } else if (exportMode === "victim") {
                            casesToShow = allCases.filter(
                              c => c.victimName && c.victimName.toLowerCase() === selectedVictim.toLowerCase()
                            );
                          }
                          
                          // Apply filters
                          if (exportFilters.purok) {
                            casesToShow = casesToShow.filter(c => 
                              c.location && c.location.toLowerCase().includes(exportFilters.purok.toLowerCase())
                            );
                          }
                          if (exportFilters.status) {
                            casesToShow = casesToShow.filter(c => 
                              c.status && c.status.toLowerCase() === exportFilters.status.toLowerCase()
                            );
                          }
                          if (exportFilters.riskLevel) {
                            casesToShow = casesToShow.filter(c => 
                              c.riskLevel && c.riskLevel.toLowerCase() === exportFilters.riskLevel.toLowerCase()
                            );
                          }
                          if (exportFilters.incidentType) {
                            casesToShow = casesToShow.filter(c => 
                              c.incidentType && c.incidentType.toLowerCase() === exportFilters.incidentType.toLowerCase()
                            );
                          }
                          if (exportFilters.victimType) {
                            casesToShow = casesToShow.filter(c => 
                              c.victimType && c.victimType.toLowerCase() === exportFilters.victimType.toLowerCase()
                            );
                          }

                          // Apply date filters
                          if (exportFilters.year) {
                            casesToShow = casesToShow.filter(c => {
                              if (!c.createdAt) return false;
                              const date = new Date(c.createdAt);
                              if (date.getFullYear() !== parseInt(exportFilters.year)) return false;
                              
                              if (exportFilters.month !== "") {
                                if (date.getMonth() !== parseInt(exportFilters.month)) return false;
                                
                                if (exportFilters.week !== "") {
                                  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
                                  const weekOfMonth = Math.ceil((date.getDate() + firstDay.getDay()) / 7);
                                  if (weekOfMonth !== parseInt(exportFilters.week)) return false;
                                }
                              }
                              return true;
                            });
                          }

                          return casesToShow.map((caseItem) => {
                            const isSelected = selectedCases.includes(caseItem.caseID);
                            return (
                              <div
                                key={caseItem.caseID}
                                onClick={() => handleCaseSelection(caseItem.caseID, !isSelected)}
                                style={{
                                  padding: screens.xs ? '10px' : '14px',
                                  borderRadius: screens.xs ? 6 : 8,
                                  background: isSelected ? BRAND.violet : '#fff',
                                  border: `${isSelected ? 2 : 1}px solid ${isSelected ? BRAND.violet : '#d9d9d9'}`,
                                  cursor: 'pointer',
                                  transition: 'all 0.3s',
                                  boxShadow: isSelected ? '0 2px 8px rgba(122,90,248,0.2)' : 'none'
                                }}
                              >
                                <div style={{ marginBottom: screens.xs ? 6 : 10 }}>
                                  <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'flex-start',
                                    gap: screens.xs ? 4 : 8,
                                    marginBottom: screens.xs ? 6 : 8,
                                    flexWrap: screens.xs ? 'wrap' : 'nowrap'
                                  }}>
                                    <span style={{ 
                                      fontSize: screens.xs ? 13 : 15, 
                                      fontWeight: 700,
                                      color: isSelected ? '#fff' : BRAND.violet,
                                      lineHeight: '22px'
                                    }}>
                                      {caseItem.caseID}
                                    </span>
                                    <div style={{ display: 'flex', gap: screens.xs ? 4 : 6, flexShrink: 0, flexWrap: 'wrap' }}>
                                      <Tag 
                                        color={statusColor(caseItem.status)} 
                                        style={{ 
                                          borderRadius: 999, 
                                          margin: 0,
                                          fontSize: screens.xs ? 9 : 11,
                                          padding: screens.xs ? '1px 6px' : '2px 10px'
                                        }}
                                      >
                                        {caseItem.status}
                                      </Tag>
                                      <Tag 
                                        color={riskColor(caseItem.riskLevel)} 
                                        style={{ 
                                          borderRadius: 999, 
                                          margin: 0,
                                          fontSize: screens.xs ? 9 : 11,
                                          padding: screens.xs ? '1px 6px' : '2px 10px'
                                        }}
                                      >
                                        {caseItem.riskLevel}
                                      </Tag>
                                    </div>
                                  </div>
                                </div>
                                
                                <div style={{ display: 'grid', gap: screens.xs ? '4px' : '6px' }}>
                                  <div style={{ fontSize: screens.xs ? 11 : 13 }}>
                                    <span style={{ 
                                      color: isSelected ? 'rgba(255,255,255,0.75)' : '#666',
                                      fontWeight: 500
                                    }}>
                                      Type:
                                    </span>
                                    {' '}
                                    <span style={{ 
                                      color: isSelected ? '#fff' : '#000',
                                      fontWeight: 600
                                    }}>
                                      {caseItem.incidentType}
                                    </span>
                                  </div>
                                  
                                  {caseItem.location && (
                                    <div style={{ fontSize: screens.xs ? 11 : 13 }}>
                                      <span style={{ 
                                        color: isSelected ? 'rgba(255,255,255,0.75)' : '#666',
                                        fontWeight: 500
                                      }}>
                                        Location:
                                      </span>
                                      {' '}
                                      <span style={{ 
                                        color: isSelected ? '#fff' : '#000',
                                        fontWeight: 600
                                      }}>
                                        {caseItem.location}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          });
                        })()
                      )}
                    </div>
                  </div>
                </Col>
              )}
            </Row>
          </div>
        </Modal>
        </Card>
        </div>
      </Content>

      {/* Polish (rounded controls, violet focus, glassy table) */}
      <style>{`
        .pretty-table .ant-table {
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid ${BRAND.soft};
          background: #fff;
        }
        .pretty-table .ant-table-thead > tr > th {
          background: #faf7ff;
          color: #5a4ae6;
          font-weight: 700;
        }
        .pretty-table .ant-table-tbody > tr:hover > td {
          background: #fbf8ff !important;
        }

        /* Mobile adjustments: tighter padding and allow wrapping */
        @media (max-width: 576px) {
          .pretty-table .ant-table-thead > tr > th {
            padding: 10px 8px !important;
            font-size: 13px;
            font-weight: 600;
          }
          .pretty-table .ant-table-tbody > tr > td {
            padding: 10px 8px !important;
            white-space: nowrap !important;
          }
          .pretty-table .ant-table-container { 
            overflow-x: auto; 
            overflow-y: visible;
          }
          .pretty-table .ant-table-wrapper { 
            overflow-x: auto;
          }
          .pretty-table .ant-table-cell-fix-left,
          .pretty-table .ant-table-cell-fix-right {
            position: sticky !important;
            z-index: 2 !important;
            background: #fff !important;
          }
          .pretty-table .ant-table-cell-fix-left {
            left: 0 !important;
          }
          .pretty-table .ant-table-cell-fix-right {
            right: 0 !important;
            box-shadow: -2px 0 4px rgba(0,0,0,0.05) !important;
          }
        }
        .row-action {
          border-radius: 10px;
        }
        .ant-input,
        .ant-input-affix-wrapper,
        .ant-select-selector,
        .ant-btn:not(.ant-btn-circle) {
          border-radius: 12px !important;
        }
        .ant-input:focus,
        .ant-input-affix-wrapper-focused,
        .ant-select-focused .ant-select-selector,
        .ant-btn:focus,
        .ant-btn:active,
        .ant-btn-text:focus,
        .ant-btn-text:active,
        .ant-btn:focus-visible,
        button:focus,
        button:active {
          outline: none !important;
        }
        .ant-btn:focus-visible {
          border-color: ${BRAND.violet} !important;
          box-shadow: 0 0 0 2px rgba(122,90,248,0.15) !important;
        }

        /* Custom Scrollbar - Auto-hide when not in use */
        .ant-layout-content ::-webkit-scrollbar,
        .ant-table-body ::-webkit-scrollbar,
        .ant-modal-body ::-webkit-scrollbar,
        .ant-col::-webkit-scrollbar,
        .case-list-scroll::-webkit-scrollbar,
        div[style*="overflowY: auto"]::-webkit-scrollbar,
        div[style*="overflow-y: auto"]::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }

        .ant-layout-content ::-webkit-scrollbar-track,
        .ant-table-body ::-webkit-scrollbar-track,
        .ant-modal-body ::-webkit-scrollbar-track,
        .ant-col::-webkit-scrollbar-track,
        .case-list-scroll::-webkit-scrollbar-track,
        div[style*="overflowY: auto"]::-webkit-scrollbar-track,
        div[style*="overflow-y: auto"]::-webkit-scrollbar-track {
          background: transparent;
        }

        .ant-layout-content ::-webkit-scrollbar-thumb,
        .ant-table-body ::-webkit-scrollbar-thumb,
        .ant-modal-body ::-webkit-scrollbar-thumb,
        .ant-col::-webkit-scrollbar-thumb,
        .case-list-scroll::-webkit-scrollbar-thumb,
        div[style*="overflowY: auto"]::-webkit-scrollbar-thumb,
        div[style*="overflow-y: auto"]::-webkit-scrollbar-thumb {
          background: transparent;
          border-radius: 3px;
          transition: background 0.2s ease;
        }

        /* Show scrollbar on hover */
        .ant-layout-content:hover ::-webkit-scrollbar-thumb,
        .ant-table-body:hover ::-webkit-scrollbar-thumb,
        .ant-modal-body:hover ::-webkit-scrollbar-thumb,
        .ant-col:hover::-webkit-scrollbar-thumb,
        .case-list-scroll:hover::-webkit-scrollbar-thumb,
        div[style*="overflowY: auto"]:hover::-webkit-scrollbar-thumb,
        div[style*="overflow-y: auto"]:hover::-webkit-scrollbar-thumb {
          background: #a78bfa;
        }

        .ant-layout-content ::-webkit-scrollbar-thumb:hover,
        .ant-table-body ::-webkit-scrollbar-thumb:hover,
        .ant-modal-body ::-webkit-scrollbar-thumb:hover,
        .ant-col::-webkit-scrollbar-thumb:hover,
        .case-list-scroll::-webkit-scrollbar-thumb:hover,
        div[style*="overflowY: auto"]::-webkit-scrollbar-thumb:hover,
        div[style*="overflow-y: auto"]::-webkit-scrollbar-thumb:hover {
          background: #8b5cf6;
        }

        /* Firefox scrollbar - auto-hide */
        .ant-layout-content,
        .ant-table-body,
        .ant-modal-body,
        .ant-col,
        .case-list-scroll,
        div[style*="overflowY: auto"],
        div[style*="overflow-y: auto"] {
          scrollbar-width: thin;
          scrollbar-color: transparent transparent;
        }

        .ant-layout-content:hover,
        .ant-table-body:hover,
        .ant-modal-body:hover,
        .ant-col:hover,
        .case-list-scroll:hover,
        div[style*="overflowY: auto"]:hover,
        div[style*="overflow-y: auto"]:hover {
          scrollbar-color: #a78bfa #f1eeff;
        }
      `}</style>
    </Layout>
  );
}
