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
} from "@ant-design/icons";
import dayjs from "dayjs";
import { api, getUserType } from "../../lib/api";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  
  // Delete confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState(null);
  
  // Combined Export modal
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportType, setExportType] = useState("csv"); // "csv" or "pdf"
  const [exportMode, setExportMode] = useState("officer"); // "officer" or "victim"
  const [selectedOfficer, setSelectedOfficer] = useState("");
  const [selectedVictim, setSelectedVictim] = useState("");
  const [exportFilters, setExportFilters] = useState({
    purok: "",
    status: "",
    riskLevel: "",
    incidentType: "",
    victimType: ""
  });
  const [selectedCases, setSelectedCases] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  
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

  useEffect(() => {
    fetchAllCases();
    
    const fetchUserType = async () => {
      try {
        const type = await getUserType();
        setUserType(type);
      } catch (err) {
        console.error("Failed to get user type", err);
        setUserType("user"); // fallback
      }
    };
    fetchUserType();
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
    await fetchReports();
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

      addForm.setFieldsValue({
        reportID: rep.reportID,
        incidentType: rep.incidentType,
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
          description: selectedReport.description,
          perpetrator: selectedReport.perpetrator || "",
          location: location,
          dateReported: selectedReport.dateReported || dateReportedValue,
          status: vals.status || "Open",
          assignedOfficer: vals.assignedOfficer || "",
          riskLevel:
            typeof vals.riskLevel === "undefined" ? undefined : vals.riskLevel || "Low",
          victimType: vals.victimType || selectedReport.victim?.victimType || "anonymous",
        };
      } else {
        payload = {
          caseID: vals.caseID,
          reportID: vals.reportID || null,
          victimID: vals.victimID || null,
          victimName: vals.victimName,
          incidentType: vals.incidentType,
          description: vals.description,
          perpetrator: vals.perpetrator || "",
          location: location,
          dateReported: dateReportedValue,
          status: vals.status || "Open",
          assignedOfficer: vals.assignedOfficer || "",
          riskLevel:
            typeof vals.riskLevel === "undefined" ? undefined : vals.riskLevel || "Low",
          victimType: vals.victimType || "anonymous",
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
      
      const payload = {
        ...vals,
        location: location,
        perpetrator: vals.perpetrator || "",
        victimName: vals.victimName || editingCase.victimName || "",
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
  }, [allCases, searchText, filterType]);

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

  // Get unique incident types
  const getUniqueIncidentTypes = () => {
    const types = allCases
      .map(c => c.incidentType)
      .filter(t => t && t.trim() !== "");
    return [...new Set(types)].sort();
  };

  // Export all filtered cases to CSV
  const handleExportAllCSV = () => {
    if (filteredCases.length === 0) {
      message.warning("No cases to export");
      return;
    }

    const headers = [
      "Case ID",
      "Report ID",
      "Victim Name",
      "Victim Type",
      "Incident Type",
      "Description",
      "Perpetrator",
      "Location",
      "Date Reported",
      "Status",
      "Assigned Officer",
      "Risk Level",
      "Created At"
    ];

    const csvRows = [headers.join(",")];

    filteredCases.forEach(c => {
      const row = [
        c.caseID || "",
        c.reportID || "",
        `"${(c.victimName || "").replace(/"/g, '""')}"`,
        c.victimType || "",
        c.incidentType || "",
        `"${(c.description || "").replace(/"/g, '""')}"`,
        `"${(c.perpetrator || "").replace(/"/g, '""')}"`,
        `"${(c.location || "").replace(/"/g, '""')}"`,
        c.dateReported ? new Date(c.dateReported).toLocaleString() : "",
        c.status || "",
        `"${(c.assignedOfficer || "").replace(/"/g, '""')}"`,
        c.riskLevel || "",
        c.createdAt ? new Date(c.createdAt).toLocaleString() : ""
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `VAWCare_All_Cases_${timestamp}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    message.success(`Exported ${filteredCases.length} case(s) to CSV`);
  };

  // Export cases for a specific officer with filters
  const handleExportOfficerCases = (officerName) => {
    if (!officerName || officerName.trim() === "") {
      message.warning("Please select an officer");
      return;
    }

    let officerCases = allCases.filter(
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

    if (exportFilters.victimType) {
      officerCases = officerCases.filter(c => 
        c.victimType && c.victimType.toLowerCase() === exportFilters.victimType.toLowerCase()
      );
    }

    if (officerCases.length === 0) {
      message.warning(`No cases found matching the selected criteria`);
      return;
    }

    // Convert to CSV
    const headers = [
      "Case ID",
      "Report ID",
      "Incident Type",
      "Description",
      "Perpetrator",
      "Location",
      "Date Reported",
      "Status",
      "Assigned Officer",
      "Risk Level",
      "Created At"
    ];

    const csvRows = [headers.join(",")];

    officerCases.forEach(c => {
      const row = [
        c.caseID || "",
        c.reportID || "",
        c.incidentType || "",
        `"${(c.description || "").replace(/"/g, '""')}"`,
        c.perpetrator || "",
        c.location || "",
        c.dateReported ? new Date(c.dateReported).toLocaleString() : "",
        c.status || "",
        c.assignedOfficer || "",
        c.riskLevel || "",
        c.createdAt ? new Date(c.createdAt).toLocaleString() : ""
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    const sanitizedOfficerName = officerName.replace(/[^a-zA-Z0-9]/g, "_");
    const timestamp = new Date().toISOString().split('T')[0];
    
    // Create filename based on whether victim is also selected
    let filename;
    if (selectedVictim) {
      const sanitizedVictimName = selectedVictim.replace(/[^a-zA-Z0-9]/g, "_");
      filename = `Cases_${sanitizedOfficerName}_Victim_${sanitizedVictimName}_${timestamp}.csv`;
    } else {
      filename = `Cases_${sanitizedOfficerName}_${timestamp}.csv`;
    }
    
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const exportMessage = selectedVictim 
      ? `Exported ${officerCases.length} case(s) for ${officerName} handling ${selectedVictim}'s cases`
      : `Exported ${officerCases.length} case(s) for ${officerName}`;
    message.success(exportMessage);
    setExportModalVisible(false);
    setSelectedOfficer("");
    setSelectedVictim("");
    setExportFilters({ purok: "", status: "", riskLevel: "", incidentType: "", victimType: "" });
    setExportType("csv");
    setExportMode("officer");
  };

  // Export cases for a specific victim with filters
  const handleExportVictimCases = (victimName) => {
    if (!victimName || victimName.trim() === "") {
      message.warning("Please select a victim");
      return;
    }

    let victimCases = allCases.filter(
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

    if (exportFilters.victimType) {
      victimCases = victimCases.filter(c => 
        c.victimType && c.victimType.toLowerCase() === exportFilters.victimType.toLowerCase()
      );
    }

    if (victimCases.length === 0) {
      message.warning(`No cases found matching the selected criteria`);
      return;
    }

    // Convert to CSV
    const headers = [
      "Case ID",
      "Report ID",
      "Victim Name",
      "Victim Type",
      "Incident Type",
      "Description",
      "Perpetrator",
      "Location",
      "Date Reported",
      "Status",
      "Assigned Officer",
      "Risk Level",
      "Created At"
    ];

    const csvRows = [headers.join(",")];

    victimCases.forEach(c => {
      const row = [
        c.caseID || "",
        c.reportID || "",
        `"${(c.victimName || "").replace(/"/g, '""')}"`,
        c.victimType || "",
        c.incidentType || "",
        `"${(c.description || "").replace(/"/g, '""')}"`,
        `"${(c.perpetrator || "").replace(/"/g, '""')}"`,
        `"${(c.location || "").replace(/"/g, '""')}"`,
        c.dateReported ? new Date(c.dateReported).toLocaleString() : "",
        c.status || "",
        `"${(c.assignedOfficer || "").replace(/"/g, '""')}"`,
        c.riskLevel || "",
        c.createdAt ? new Date(c.createdAt).toLocaleString() : ""
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    const sanitizedVictimName = victimName.replace(/[^a-zA-Z0-9]/g, "_");
    const timestamp = new Date().toISOString().split('T')[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `Cases_Victim_${sanitizedVictimName}_${timestamp}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    message.success(`Exported ${victimCases.length} case(s) for victim: ${victimName}`);
    setExportModalVisible(false);
    setSelectedOfficer("");
    setSelectedVictim("");
    setExportFilters({ purok: "", status: "", riskLevel: "", incidentType: "", victimType: "" });
    setExportType("csv");
    setExportMode("officer");
  };

  // Get filtered case count for preview
  const getFilteredCaseCount = () => {
    let cases = [];
    
    if (exportMode === "officer") {
      if (!selectedOfficer) return 0;
      cases = allCases.filter(
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
      cases = allCases.filter(
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

    if (exportFilters.victimType) {
      cases = cases.filter(c => 
        c.victimType && c.victimType.toLowerCase() === exportFilters.victimType.toLowerCase()
      );
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

    if (!selectedOfficer) {
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
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
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

          <Space direction="vertical" size={0}>
            <Title level={4} style={{ margin: 0, color: BRAND.violet }}>
              Case Management
            </Title>
            {isMdUp && (
              <Text type="secondary" style={{ fontSize: 13 }}>
                Review, create, and update cases
              </Text>
            )}
          </Space>
        </div>

        <Space wrap>
          <Button
            type="primary"
            onClick={openAddModal}
            style={{
              background: BRAND.violet,
              borderColor: BRAND.violet,
              borderRadius: 12,
              fontWeight: 700,
            }}
            icon={!isMdUp ? undefined : undefined}
          >
            {isMdUp ? "Add Case" : "Add"}
          </Button>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => setExportModalVisible(true)}
            style={{ borderColor: BRAND.violet, color: BRAND.violet, borderRadius: 12, fontWeight: 700 }}
            title="Export Cases"
          >
            {isMdUp ? "Export" : null}
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchAllCases}
            style={{ borderColor: BRAND.violet, color: BRAND.violet, borderRadius: 12, fontWeight: 700 }}
            title="Refresh"
          >
            {isMdUp ? "Refresh" : null}
          </Button>
        </Space>
      </Header>

      <Content
        style={{
          padding: screens.xs ? 8 : screens.sm ? 10 : 16,
          display: "flex",
          justifyContent: "center",
          paddingBottom: "max(16px, env(safe-area-inset-bottom))",
        }}
      >
        <Card
          bordered
          style={{
            width: "100%",
            maxWidth: 1320,
            borderRadius: screens.xs ? 12 : 18,
            borderColor: BRAND.soft,
            boxShadow: "0 20px 46px rgba(122,90,248,0.06)",
          }}
          bodyStyle={{ padding: screens.xs ? 8 : screens.sm ? 12 : 16 }}
          title={
            <div
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <Space direction="vertical" size={10}>
                <Text strong style={{ color: "#000000ff" }}>
                  All Cases
                </Text>
              </Space>
            </div>
          }
          extra={
            <Space wrap size={screens.xs ? 4 : 8}>
              <Input
                allowClear
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={screens.xs ? "Search…" : "Search cases…"}
                prefix={<SearchOutlined />}
                style={{ 
                  width: screens.xs ? 140 : screens.sm ? 180 : 260, 
                  borderRadius: 999 
                }}
              />
              <Select
                value={filterType}
                onChange={setFilterType}
                style={{ width: screens.xs ? 120 : screens.sm ? 160 : 200 }}
                dropdownMatchSelectWidth={220}
              >
                <Option value="all">All Cases</Option>
                <Option value="Open">Open</Option>
                <Option value="Under Investigation">In-Progress</Option>
                <Option value="Resolved">Resolved</Option>
                <Option value="Cancelled">Cancelled</Option>
              </Select>
            </Space>
          }
        >
          <Table
            rowKey="caseID"
            columns={screens.xs ? columnsMobile : columns}
            dataSource={filteredCases}
            loading={loading}
            pagination={{ 
              pageSize: 10, 
              showSizeChanger: false,
              size: screens.xs ? 'small' : 'default',
              position: ['bottomLeft']
            }}
            scroll={{
              x: screens.xs ? 450 : 980,
              y: screens.xs ? 420 : screens.sm ? 460 : 520,
            }}
            tableLayout="auto"
            className="pretty-table"
            sortDirections={['descend']}
            size={screens.xs ? 'small' : 'middle'}
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
            <Form form={form} layout="vertical">
              <Form.Item
                name="victimName"
                label="Victim Name"
                rules={[{ required: true, message: "Victim Name is required" }]}
              >
                <Input 
                  disabled={isViewMode}
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
              <Form.Item name="description" label="Description">
                <Input.TextArea rows={3} disabled={isViewMode} />
              </Form.Item>
              <Form.Item name="perpetrator" label="Perpetrator">
                <Input 
                  disabled={isViewMode}
                  onKeyPress={(e) => {
                    if (/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                />
              </Form.Item>
              <Form.Item name="assignedOfficer" label="Assigned Officer">
                <Input 
                  disabled={isViewMode}
                  onKeyPress={(e) => {
                    if (/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
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
            <Form form={addForm} layout="vertical">
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
                    rules={[{ required: true, message: "Victim name is required" }]}
                  >
                    <Input 
                      placeholder="Enter victim's full name" 
                      size="large"
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
                    <Select placeholder="Select incident type" size="large">
                      <Option value="Economic">Economic Abuse</Option>
                      <Option value="Psychological">Psychological Abuse</Option>
                      <Option value="Physical">Physical Abuse</Option>
                      <Option value="Sexual">Sexual Abuse</Option>
                    </Select>
                  </Form.Item>
                </Col>
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
                rules={[{ required: true, message: "Description is required" }]}
              >
                <Input.TextArea 
                  rows={4} 
                  placeholder="Provide detailed description of the incident..."
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

              {/* Perpetrator and Assigned Officer Row */}
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item 
                    name="perpetrator" 
                    label={<Text strong>Perpetrator</Text>}
                  >
                    <Input 
                      placeholder="Enter perpetrator's name (if known)" 
                      size="large"
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
                    rules={[{ required: true, message: "Assigned officer is required" }]}
                  >
                    <Input 
                      placeholder="Enter officer's name" 
                      size="large"
                      onKeyPress={(e) => {
                        if (/[0-9]/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
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
            setExportFilters({ purok: "", status: "", riskLevel: "", incidentType: "" });
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
                setExportFilters({ purok: "", status: "", riskLevel: "", incidentType: "", victimType: "" });
                setSelectedCases([]);
                setExportType("csv");
                setExportMode("officer");
              }}
            >
              Cancel
            </Button>,
            (selectedOfficer || selectedVictim) && (
              <Button
                key="export-csv"
                icon={<DownloadOutlined />}
                onClick={() => exportMode === "officer" ? handleExportOfficerCases(selectedOfficer) : handleExportVictimCases(selectedVictim)}
                style={{ background: BRAND.violet, borderColor: BRAND.violet, color: '#fff' }}
              >
                CSV ({getFilteredCaseCount()})
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
              height: (selectedOfficer || selectedVictim) ? (screens.xs ? 'auto' : screens.sm ? '65vh' : '62vh') : 'auto',
              maxHeight: (selectedOfficer || selectedVictim) ? (screens.xs ? '80vh' : screens.sm ? '65vh' : '62vh') : '40vh',
              overflow: screens.xs && (selectedOfficer || selectedVictim) ? 'auto' : 'hidden'
            },
            mask: {
              backdropFilter: 'blur(4px)'
            }
          }}
          maskClosable={false}
        >
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            height: (selectedOfficer || selectedVictim) ? (screens.xs ? 'auto' : screens.sm ? '65vh' : '62vh') : 'auto',
            maxHeight: (selectedOfficer || selectedVictim) ? (screens.xs ? 'none' : screens.sm ? '65vh' : '62vh') : '40vh'
          }}>
            {/* Side-by-side layout */}
            <Row gutter={screens.xs ? 0 : 16} style={{ 
              flex: 1,
              overflow: 'hidden',
              margin: 0,
              flexDirection: screens.xs && (selectedOfficer || selectedVictim) ? 'column' : 'row'
            }}>
              {/* Left side - Selection & Filters */}
              <Col xs={24} md={(selectedOfficer || selectedVictim) ? 10 : 24} style={{
                height: 'auto',
                overflowY: screens.xs ? 'visible' : 'auto',
                padding: screens.xs ? '12px 16px' : screens.sm ? '14px 12px' : '18px 20px',
                maxHeight: screens.xs ? 'none' : '100%',
                borderRight: screens.xs ? 'none' : (selectedOfficer || selectedVictim) ? `1px solid ${BRAND.soft}` : 'none',
                flexShrink: 0
              }}>
                <Form layout="vertical">
                {/* Export Mode Radio Selection - Show all options initially, only selected when officer/victim is chosen */}
                {!(selectedOfficer || selectedVictim) ? (
                  <Form.Item
                    label={<Text strong style={{ fontSize: 15 }}>Export Cases By</Text>}
                    style={{ marginBottom: 16 }}
                  >
                    <Radio.Group 
                      value={exportMode} 
                      onChange={(e) => {
                        setExportMode(e.target.value);
                        setSelectedOfficer("");
                        setSelectedVictim("");
                        setExportFilters({ purok: "", status: "", riskLevel: "", incidentType: "", victimType: "" });
                        setSelectedCases([]);
                      }}
                      style={{ width: '100%' }}
                    >
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <Radio value="officer" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: exportMode === 'officer' ? `2px solid ${BRAND.violet}` : '1px solid #d9d9d9', background: exportMode === 'officer' ? BRAND.soft : '#fff' }}>
                          <Text strong>Assigned Officer</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>Export cases assigned to a specific officer</Text>
                        </Radio>
                        <Radio value="victim" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: exportMode === 'victim' ? `2px solid ${BRAND.violet}` : '1px solid #d9d9d9', background: exportMode === 'victim' ? BRAND.soft : '#fff' }}>
                          <Text strong>Victim Name</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>Export all cases for a specific victim</Text>
                        </Radio>
                      </Space>
                    </Radio.Group>
                  </Form.Item>
                ) : (
                  <div style={{ marginBottom: 16 }}>
                    <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 8 }}>Export Cases By</Text>
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
                      onChange={(val) => setExportFilters({ ...exportFilters, incidentType: val })}
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
              </Row>

              {(selectedOfficer || selectedVictim) && (
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
                  height: screens.xs ? 'auto' : '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: screens.xs ? '12px 16px 16px 16px' : screens.sm ? '14px 12px' : '18px 20px',
                  overflow: 'hidden',
                  borderTop: screens.xs ? `2px solid ${BRAND.soft}` : 'none',
                  marginTop: screens.xs ? 8 : 0,
                  minHeight: screens.xs ? 300 : 0
                }}>
                  <div style={{
                    background: '#fafafa',
                    borderRadius: screens.xs ? 8 : 12,
                    padding: screens.xs ? 12 : 16,
                    height: screens.xs ? 'auto' : '100%',
                    maxHeight: screens.xs ? 'none' : '100%',
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
                        minHeight: screens.xs ? 200 : 300,
                        maxHeight: screens.xs ? 400 : 480
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

        /* Custom scrollbar styling for modal and case list */
        .ant-modal-body::-webkit-scrollbar,
        .ant-col::-webkit-scrollbar,
        .case-list-scroll::-webkit-scrollbar,
        div[style*="overflowY: auto"]::-webkit-scrollbar,
        div[style*="overflow-y: auto"]::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .ant-modal-body::-webkit-scrollbar-track,
        .ant-col::-webkit-scrollbar-track,
        .case-list-scroll::-webkit-scrollbar-track,
        div[style*="overflowY: auto"]::-webkit-scrollbar-track,
        div[style*="overflow-y: auto"]::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.03);
          border-radius: 10px;
          margin: 4px;
        }

        .ant-modal-body::-webkit-scrollbar-thumb,
        .ant-col::-webkit-scrollbar-thumb,
        .case-list-scroll::-webkit-scrollbar-thumb,
        div[style*="overflowY: auto"]::-webkit-scrollbar-thumb,
        div[style*="overflow-y: auto"]::-webkit-scrollbar-thumb {
          background: ${BRAND.violet};
          border-radius: 10px;
        }

        .ant-modal-body::-webkit-scrollbar-thumb:hover,
        .ant-col::-webkit-scrollbar-thumb:hover,
        .case-list-scroll::-webkit-scrollbar-thumb:hover,
        div[style*="overflowY: auto"]::-webkit-scrollbar-thumb:hover,
        div[style*="overflow-y: auto"]::-webkit-scrollbar-thumb:hover {
          background: #6a4ae0;
        }

        /* Firefox scrollbar */
        .ant-modal-body,
        .ant-col,
        .case-list-scroll,
        div[style*="overflowY: auto"],
        div[style*="overflow-y: auto"] {
          scrollbar-width: thin;
          scrollbar-color: ${BRAND.violet} rgba(0, 0, 0, 0.03);
        }

        /* Smooth scrolling */
        .ant-modal-body,
        .ant-col,
        .case-list-scroll,
        div[style*="overflowY: auto"],
        div[style*="overflow-y: auto"] {
          scroll-behavior: smooth;
        }

        /* Hide scrollbar when not hovering on mobile */
        @media (max-width: 768px) {
          .ant-modal-body::-webkit-scrollbar,
          .ant-col::-webkit-scrollbar,
          .case-list-scroll::-webkit-scrollbar,
          div[style*="overflowY: auto"]::-webkit-scrollbar,
          div[style*="overflow-y: auto"]::-webkit-scrollbar {
            width: 6px;
          }
        }
      `}</style>
    </Layout>
  );
}
