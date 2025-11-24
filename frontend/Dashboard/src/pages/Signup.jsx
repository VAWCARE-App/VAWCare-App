import React, { useState } from "react";
import {
  App as AntApp,
  Button,
  Card,
  Form,
  Input,
  Typography,
  Flex,
  Grid,
  Select,
  Radio,
  Row,
  Col,
  Modal,
  Checkbox,
  Tag,
  Space,
} from "antd";
import { api } from "../lib/api";
import { exchangeCustomTokenForIdToken } from "../lib/firebase";
import { SafetyCertificateOutlined, ExclamationCircleOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate, Link } from "react-router-dom";
import Stepper, { Step } from "../components/Stepper";

const { Option } = Select;

/* ---------- Background Carousel Layer ---------- */
function BackgroundCarouselLayer({ slides, speed = 30, top = "20vh", opacity = 0.5, reverse = false }) {
  return (
    <div
      className="bg-carousel-layer"
      style={{
        top,
        transform: `rotate(-10deg) perspective(800px) rotateX(8deg)`,
        opacity,
      }}
    >
      <div
        className="bg-carousel-track"
        style={{
          animation: `${reverse ? "slideLoopReverse" : "slideLoop"} ${speed}s linear infinite`,
        }}
      >
        {[...slides, ...slides].map((s, i) => (
          <div key={i} className="bg-slide" style={{ background: s.color }}>
            <span className="bg-slide__text">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Multi-Layer Background Carousel ---------- */
function MultiBackgroundCarousel() {
  const slides = [
    { color: "#ffd1dc", label: "Support" },
    { color: "#ff9bb5", label: "Safety" },
    { color: "#ffc4d3", label: "Care" },
    { color: "#ffb3c4", label: "Hope" },
    { color: "#ff8fa8", label: "Trust" },
  ];

  return (
    <>
      <div className="bg-carousel">
        <BackgroundCarouselLayer slides={slides} speed={28} top="12vh" opacity={0.55} />
        <BackgroundCarouselLayer slides={slides} speed={34} top="28vh" opacity={0.5} reverse />
        <BackgroundCarouselLayer slides={slides} speed={40} top="44vh" opacity={0.45} />
        <BackgroundCarouselLayer slides={slides} speed={48} top="60vh" opacity={0.4} reverse />
        <BackgroundCarouselLayer slides={slides} speed={56} top="76vh" opacity={0.35} />
      </div>

      <style>{`
        .bg-carousel {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .bg-carousel-layer {
          position: absolute;
          left: -15vw;
          right: -15vw;
          height: clamp(160px, 24vh, 220px);
          -webkit-mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.85) 18%, rgba(0,0,0,0.85) 82%, transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.85) 18%, rgba(0,0,0,0.85) 82%, transparent 100%);
        }
        .bg-carousel-track {
          display: flex;
          gap: 18px;
          will-change: transform;
        }
        .bg-slide {
          width: clamp(160px, 26vw, 300px);
          height: 100%;
          border-radius: 16px;
          box-shadow:
            inset 0 6px 12px rgba(255,255,255,0.35),
            inset 0 -8px 16px rgba(0,0,0,0.08),
            0 18px 28px rgba(233,30,99,0.12);
          display: grid;
          place-items: center;
          position: relative;
          overflow: hidden;
          transition: transform 0.4s ease;
        }
        .bg-slide:hover { transform: scale(1.05); }
        .bg-slide__text {
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #fff;
          mix-blend-mode: multiply;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.15));
          font-size: clamp(16px, 2.5vw, 24px);
          opacity: 0.45;
          user-select: none;
        }
        .bg-slide::after {
          content: "";
          position: absolute;
          inset: -40%;
          background: radial-gradient(circle at 50% 40%, rgba(255,255,255,0.18), transparent 60%);
        }
        @keyframes slideLoop {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes slideLoopReverse {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        @media (max-width: 576px) {
          .bg-carousel-layer { opacity: 0.3; height: 120px; }
        }
        @media (max-width: 380px) {
          .bg-carousel { display: none; }
        }
        .signup-card { animation: fadeInUp 0.8s ease both; }
        @keyframes fadeInUp {
          0% { opacity: 0; transform: translateY(40px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}

/* ---------- Signup Component ---------- */
export default function Signup() {
  const { message } = AntApp.useApp();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState("anonymous");
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successRedirect, setSuccessRedirect] = useState(null);
  const [missingFields, setMissingFields] = useState([]);
  const [showMissingModal, setShowMissingModal] = useState(false);
  const screens = Grid.useBreakpoint();

  const maxWidth = screens.xl ? 520 : screens.lg ? 480 : screens.md ? 420 : 360;

  // Sync accountType with form value on mount and when going back
  React.useEffect(() => {
    const currentValue = form.getFieldValue('victimAccount');
    if (currentValue && currentValue !== accountType) {
      setAccountType(currentValue);
    }
  }, [currentStep, form, accountType]);

  // Handle success modal and navigation
  React.useEffect(() => {
    if (showSuccessModal && successRedirect) {
      const timer = setTimeout(() => {
        setShowSuccessModal(false);
        navigate(successRedirect);
      }, 3000); 
      
      return () => clearTimeout(timer);
    }
  }, [showSuccessModal, successRedirect, navigate]);

  const onFinish = async (values) => {
    try {
      setLoading(true);
      const { confirmPassword, ...payload } = values;
      const victimData = {
        victimAccount: payload.victimAccount || "anonymous",
      };
      
      if (payload.victimAccount === "regular") {
        victimData.victimUsername = payload.username;
        victimData.victimPassword = payload.password;
        victimData.victimType = payload.victimType;
        victimData.victimEmail = payload.email;
        victimData.firstName = payload.firstName;
        victimData.lastName = payload.lastName;
        victimData.address = payload.address; // Required field
        victimData.contactNumber = payload.contactNumber; // Required field
        
        // Include emergency contact if any emergency contact fields are provided
        if (
          payload.emergencyContactName ||
          payload.emergencyContactNumber ||
          payload.emergencyContactRelationship ||
          payload.emergencyContactEmail ||
          payload.emergencyContactAddress
        ) {
          const ec = {
            name: payload.emergencyContactName || "",
            relationship: payload.emergencyContactRelationship || "",
            contactNumber: payload.emergencyContactNumber || "",
            email: payload.emergencyContactEmail || "",
            address: payload.emergencyContactAddress || "",
          };
          victimData.emergencyContacts = [ec];
        }
        
        // include location if the user selected one (stored in hidden fields)
        const hasLat = payload.latitude !== undefined && payload.latitude !== '';
        const hasLng = payload.longitude !== undefined && payload.longitude !== '';
        if (hasLat && hasLng) {
          const lat = Number(payload.latitude);
          const lng = Number(payload.longitude);
          if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
            victimData.location = { lat, lng };
          }
        }
      }
      
      console.log("Submitting victimData:", victimData);
      const { data } = await api.post("/api/victims/register", victimData);
      if (data.success) {
        // Exchange custom token for ID token
        const customToken = data.data.token;
        console.log('Received custom token from register, exchanging for ID token...');
        
        try {
          const idToken = await exchangeCustomTokenForIdToken(customToken);
          console.log('Successfully exchanged for ID token');
          
          // Send ID token and user data to backend to set in HTTP-only cookies
          const userData = { ...data.data.victim, userType: "victim" };
          await api.post('/api/auth/set-token', { idToken, userData });
          console.log('ID token and user data set in HTTP-only cookies');
        } catch (exchangeError) {
          console.error('Token exchange failed:', exchangeError);
          throw new Error('Authentication token exchange failed');
        }
        
        // Only store non-sensitive userType in sessionStorage
        sessionStorage.setItem("userType", "victim");
        try {
          if (data.data && data.data.victim && data.data.victim.id) {
            sessionStorage.setItem('actorId', String(data.data.victim.id));
            sessionStorage.setItem('actorType', 'victim');
          }
        } catch (e) {
          console.warn('Unable to persist actorId on signup', e && e.message);
        }
        try {
          const businessId = data?.data?.victim?.victimID || null;
          if (businessId) sessionStorage.setItem('actorBusinessId', String(businessId));
        } catch (e) {
          console.warn('Unable to persist actorBusinessId on signup', e && e.message);
        }
        const redirect = data.data.victim?.victimAccount === "anonymous" ? "/victim/report" : "/victim/dashboard";
        setSuccessRedirect(redirect);
        setShowSuccessModal(true);
      } else throw new Error(data.message || "Registration failed");
    } catch (err) {
      const errMsg = err?.response?.data?.message || err.message || "Signup failed";
      // Try to extract field names from server validation messages (look for backticked field names)
      try {
        const re = /`([^`]+)`/g;
        const found = [];
        let m;
        while ((m = re.exec(String(errMsg)))) {
          if (m[1]) found.push(m[1]);
        }
        if (found.length > 0) {
          // Map server field names to form field keys
          const serverToForm = {
            victimUsername: 'username',
            victimPassword: 'password',
            victimEmail: 'email',
            victimType: 'victimType',
            contactNumber: 'contactNumber',
            address: 'address',
            firstName: 'firstName',
            lastName: 'lastName',
          };
          const mapped = found.map((f) => serverToForm[f] || f).filter((v, i, a) => a.indexOf(v) === i);
          setMissingFields(mapped);
          setShowMissingModal(true);
          message.error('Some required fields are missing or invalid. Please review the highlighted fields.');
        } else {
          message.error(errMsg);
          Modal.error({ title: 'Registration Failed', content: errMsg });
        }
      } catch (e) {
        console.warn('Error parsing server validation message', e);
        message.error(errMsg);
        Modal.error({ title: 'Registration Failed', content: errMsg });
      }
    } finally {
      setLoading(false);
    }
  };

  // Create anonymous account (one-tap flow) and auto-login
  const createAnonymousTicket = async () => {
    try {
      setLoading(true);
      const { data } = await api.post("/api/victims/register", { victimAccount: "anonymous" });
      if (!data || !data.success) throw new Error(data?.message || "Failed to create account");
      const resp = data.data || {};
      
      // Exchange custom token for ID token
      const customToken = resp.token;
      console.log('Received custom token from anonymous register, exchanging for ID token...');
      
      try {
        const idToken = await exchangeCustomTokenForIdToken(customToken);
        console.log('Successfully exchanged for ID token');
        
        // Send ID token and user data to backend to set in HTTP-only cookies
        const userData = { ...resp.victim, userType: "victim" };
        await api.post('/api/auth/set-token', { idToken, userData });
        console.log('ID token and user data set in HTTP-only cookies');
      } catch (exchangeError) {
        console.error('Token exchange failed:', exchangeError);
        throw new Error('Authentication token exchange failed');
      }
      
      // Only store non-sensitive userType in sessionStorage
      sessionStorage.setItem("userType", "victim");
      try {
        if (resp && resp.victim && resp.victim.id) {
          sessionStorage.setItem('actorId', String(resp.victim.id));
          sessionStorage.setItem('actorType', 'victim');
        }
      } catch (e) {
        console.warn('Unable to persist actorId for anonymous signup', e && e.message);
      }
      try {
        const businessId = resp?.victim?.victimID || null;
        if (businessId) sessionStorage.setItem('actorBusinessId', String(businessId));
      } catch (e) {
        console.warn('Unable to persist actorBusinessId for anonymous signup', e && e.message);
      }
      setSuccessRedirect("/victim/report");
      setShowSuccessModal(true);
    } catch (err) {
      message.error(err?.response?.data?.message || err.message || "Unable to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    // Use accountType state as the source of truth since it's updated by onChange
    console.log("handleSubmit - accountType state:", accountType);
    console.log("handleSubmit - form victimAccount value:", form.getFieldValue('victimAccount'));
    console.log("handleSubmit - all form values:", form.getFieldsValue(true)); // true = include all fields
    
    // For anonymous accounts, we don't need form validation as there are no required fields
    if (accountType === 'anonymous') {
      if (!agreedToPrivacy) {
        message.error('Please agree to the Data Privacy policy to continue');
        return;
      }
      // Create anonymous account directly with just the account type
      onFinish({ victimAccount: 'anonymous' });
      return;
    }
    
    // For regular accounts, validate the form
    // First, ensure the form field is set to 'regular'
    form.setFieldsValue({ victimAccount: 'regular' });
    
    // Define all the fields that need to be validated for a regular account
    const fieldsToValidate = [
      'victimAccount',
      'username',
      'victimType',
      'email',
      'password',
      'confirmPassword',
      'firstName',
      'lastName',
      'address',
      'contactNumber',
    ];
    
    form
      .validateFields(fieldsToValidate)
      .then(values => {
        console.log("Form validated successfully, values:", values);
        // Get ALL form values including optional fields
        const allValues = form.getFieldsValue(true);
        // Force victimAccount to be 'regular' based on accountType state
        const finalValues = {
          ...allValues,
          ...values, // Override with validated values
          victimAccount: 'regular'
        };
        console.log("Final values to submit:", finalValues);
        onFinish(finalValues);
      })
      .catch(errorInfo => {
        console.log("Form validation failed:", errorInfo);
        if (errorInfo.errorFields && errorInfo.errorFields.length > 0) {
          const fields = errorInfo.errorFields.map((f) => f.name[0]);
          setMissingFields(fields);
          setShowMissingModal(true);
        } else {
          message.error("Please fill all required fields.");
        }
      });
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "#fff0f5" }}>
      <MultiBackgroundCarousel />
      <Flex align="center" justify="center" style={{ minHeight: "100vh", position: "relative", zIndex: 1, padding: '12px' }}>
        <Card
          className="signup-card"
          style={{
            width: "100%",
            maxWidth,
            borderRadius: 20,
            border: "1px solid rgba(255,255,255,0.3)",
            boxShadow: "0 24px 48px rgba(0,0,0,0.1), 0 8px 16px rgba(233,30,99,0.08)",
            padding: 0,
            backdropFilter: "blur(12px) saturate(160%)",
            background: "rgba(255,255,255,0.75)",
            overflow: 'hidden',
          }}
          bodyStyle={{ padding: 0 }}
        >
          <div style={{ padding: screens.md ? 16 : 12 }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <Typography.Title 
                level={2} 
                style={{ 
                  marginBottom: 4, 
                  color: "#e91e63",
                  fontSize: screens.md ? 26 : 20,
                  fontWeight: 700,
                }}
              >
                Create your account
              </Typography.Title>
              <Typography.Paragraph style={{ marginBottom: 0, color: "#666", fontSize: 13 }}>
                Fill in your details to get started with VAWCare
              </Typography.Paragraph>
            </div>
            
            <Form
              form={form}
              layout="vertical"
              initialValues={{ victimAccount: "anonymous" }}
              onValuesChange={(changedValues) => {
                console.log("Form onValuesChange - changed values:", changedValues);
                if (changedValues.victimAccount) {
                  console.log("Form onValuesChange - victimAccount changed to:", changedValues.victimAccount);
                  setAccountType(changedValues.victimAccount);
                }
              }}
            >
            {/* Hidden fields to store chosen coordinates */}
            <Form.Item name="latitude" style={{ display: 'none' }}>
              <Input />
            </Form.Item>
            <Form.Item name="longitude" style={{ display: 'none' }}>
              <Input />
            </Form.Item>

            <Stepper
              initialStep={1}
              onStepChange={(step) => setCurrentStep(step)}
              onFinalStepCompleted={() => {
                if (agreedToPrivacy) {
                  handleSubmit();
                } else {
                  message.error('Please agree to the Data Privacy policy to continue');
                }
              }}
              nextButtonProps={{
                disabled: (accountType === 'anonymous' && currentStep === 2 && !agreedToPrivacy) || 
                         (accountType === 'regular' && currentStep === 4 && !agreedToPrivacy),
                style: {
                  background: 'linear-gradient(135deg, #5227FF 0%, #7A5AF8 100%)',
                  border: 'none',
                  borderRadius: 10,
                  height: 44,
                  fontSize: 15,
                  fontWeight: 600,
                  boxShadow: '0 4px 12px rgba(82, 39, 255, 0.3)',
                }
              }}
              backButtonProps={{
                style: {
                  borderRadius: 10,
                  height: 44,
                  fontSize: 15,
                  fontWeight: 600,
                  border: '1px solid #e0e0e0',
                }
              }}
              stepCircleContainerClassName="custom-stepper-container"
              contentClassName="custom-step-content"
              footerClassName="custom-stepper-footer"
            >
              {/* Step 1: Account Type & Credentials */}
              <Step>
                <div style={{ padding: '0 8px' }}>
                  <Typography.Title 
                    level={4} 
                    style={{ 
                      marginBottom: 16, 
                      color: "#e91e63",
                      fontSize: 17,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    Account Setup
                  </Typography.Title>
                  
                  <Form.Item name="victimAccount" label={<span style={{ fontSize: 14, fontWeight: 500 }}>Account Type</span>}>
                    <Radio.Group 
                      size="large"
                      onChange={(e) => {
                        setAccountType(e.target.value);
                        form.setFieldsValue({ victimAccount: e.target.value });
                      }}
                    >
                      <Radio value="anonymous">Anonymous Account</Radio>
                      <Radio value="regular">Regular Account</Radio>
                    </Radio.Group>
                  </Form.Item>

                  {accountType === 'regular' && (
                    <>
                      <Form.Item
                        name="username"
                        label={<span style={{ fontSize: 14, fontWeight: 500 }}>Username</span>}
                        rules={[
                          { required: true, message: "Please enter a username" },
                          { min: 4, message: "Username must be at least 4 characters" },
                        ]}
                      >
                        <Input placeholder="Enter username" size="large" />
                      </Form.Item>

                      <Row gutter={[16, 0]}>
                        <Col xs={24} sm={12}>
                          <Form.Item 
                            name="victimType" 
                            label={<span style={{ fontSize: 14, fontWeight: 500 }}>Victim Category</span>} 
                            rules={[{ required: true, message: "Please select victim type" }]}
                          >
                            <Select placeholder="Select type" size="large">
                              <Option value="Child">Child</Option>
                              <Option value="Woman">Woman</Option>
                            </Select>
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item
                            name="email"
                            label={<span style={{ fontSize: 14, fontWeight: 500 }}>Email</span>}
                            rules={[
                              { required: true, message: "Please enter your email" },
                              { type: "email", message: "Please enter a valid email" },
                            ]}
                          >
                            <Input placeholder="your@example.com" size="large" />
                          </Form.Item>
                        </Col>
                      </Row>

                      <Row gutter={[16, 0]}>
                        <Col xs={24} sm={12}>
                          <Form.Item
                            name="password"
                            label={<span style={{ fontSize: 14, fontWeight: 500 }}>Password</span>}
                            rules={[
                              { required: true, message: "Please enter a password" },
                              { min: 8, message: "Password must be at least 8 characters" },
                            ]}
                          >
                            <Input.Password placeholder="At least 8 characters" size="large" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} sm={12}>
                          <Form.Item
                            name="confirmPassword"
                            label={<span style={{ fontSize: 14, fontWeight: 500 }}>Confirm Password</span>}
                            dependencies={["password"]}
                            rules={[
                              { required: true, message: "Please confirm your password" },
                              ({ getFieldValue }) => ({
                                validator(_, value) {
                                  if (!value || getFieldValue("password") === value) return Promise.resolve();
                                  return Promise.reject(new Error("Passwords do not match"));
                                },
                              }),
                            ]}
                          >
                            <Input.Password placeholder="Re-enter password" size="large" />
                          </Form.Item>
                        </Col>
                      </Row>
                    </>
                  )}

                  {accountType === 'anonymous' && (
                    <div style={{ 
                      padding: '20px', 
                      background: 'linear-gradient(135deg, #fff9e6 0%, #fffbf0 100%)', 
                      borderRadius: 12, 
                      border: '2px solid #ffe58f',
                      marginTop: 16,
                    }}>
                      <Typography.Paragraph style={{ margin: 0, color: '#8c6d1f', fontSize: 14, lineHeight: 1.6 }}>
                        <strong>📌 Note:</strong> Anonymous accounts allow you to file reports without providing personal information.
                        You can skip personal details and proceed directly to reporting.
                      </Typography.Paragraph>
                    </div>
                  )}
                </div>
              </Step>

              {/* Step 2: Personal Information (only for regular accounts) */}
              {accountType === "regular" && (
                <Step>
                  <div style={{ padding: '0 8px' }}>
                    <Typography.Title 
                      level={4} 
                      style={{ 
                        marginBottom: 16, 
                        color: "#e91e63",
                        fontSize: 17,
                        fontWeight: 600,
                      }}
                    >
                      Personal Information
                    </Typography.Title>
                  
                    <Row gutter={[16, 0]}>
                      <Col xs={24} sm={12}>
                        <Form.Item 
                          name="firstName" 
                          label={<span style={{ fontSize: 14, fontWeight: 500 }}>First Name</span>} 
                          rules={[{ required: true, message: "Please enter your first name" }]}
                        >
                          <Input placeholder="First name" size="large" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item 
                          name="lastName" 
                          label={<span style={{ fontSize: 14, fontWeight: 500 }}>Last Name</span>} 
                          rules={[{ required: true, message: "Please enter your last name" }]}
                        >
                          <Input placeholder="Last name" size="large" />
                        </Form.Item>
                      </Col>
                    </Row>
                    
                    <Form.Item 
                      name="address" 
                      label={<span style={{ fontSize: 14, fontWeight: 500 }}>Address</span>}
                      rules={[{ required: true, message: "Please enter your address" }]}
                    >
                      <Input
                        placeholder="Your address"
                        size="large"
                      />
                    </Form.Item>
                    
                    <Form.Item
                      name="contactNumber"
                      label={<span style={{ fontSize: 14, fontWeight: 500 }}>Contact Number</span>}
                      rules={[
                        { required: true, message: "Please enter your contact number" },
                        { pattern: /^(\+63|0)[0-9]{10}$/, message: "Enter a valid Philippine phone number" }
                      ]}
                    >
                      <Input placeholder="+639123456789 or 09123456789" size="large" />
                    </Form.Item>
                  </div>
                </Step>
              )}

              {/* Step 3: Emergency Contact (only for regular accounts) */}
              {accountType === "regular" && (
                <Step>
                  <div style={{ padding: '0 8px' }}>
                    <Typography.Title 
                      level={4} 
                      style={{ 
                        marginBottom: 16, 
                        color: "#e91e63",
                        fontSize: 17,
                        fontWeight: 600,
                      }}
                    >
                      Emergency Contact
                    </Typography.Title>
                  
                    <Row gutter={[16, 0]}>
                      <Col xs={24} sm={12}>
                        <Form.Item 
                          name="emergencyContactName" 
                          label={<span style={{ fontSize: 14, fontWeight: 500 }}>Contact Name</span>}
                        >
                          <Input placeholder="Full name" size="large" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item 
                          name="emergencyContactRelationship" 
                          label={<span style={{ fontSize: 14, fontWeight: 500 }}>Relationship</span>}
                        >
                          <Input placeholder="e.g. Mother, Friend" size="large" />
                        </Form.Item>
                      </Col>
                    </Row>
                    
                    <Form.Item 
                      name="emergencyContactNumber" 
                      label={<span style={{ fontSize: 14, fontWeight: 500 }}>Contact Number</span>} 
                      rules={[{ pattern: /^(\+63|0)[0-9]{10}$/, message: "Enter a valid Philippine phone number" }]}
                    >
                      <Input placeholder="+639123456789 or 09123456789" size="large" />
                    </Form.Item>
                    
                    <Form.Item 
                      name="emergencyContactEmail" 
                      label={<span style={{ fontSize: 14, fontWeight: 500 }}>Contact Email</span>} 
                      rules={[{ type: 'email', message: 'Please enter a valid email' }]}
                    >
                      <Input placeholder="contact@example.com" size="large" />
                    </Form.Item>
                    
                    <Form.Item 
                      name="emergencyContactAddress" 
                      label={<span style={{ fontSize: 14, fontWeight: 500 }}>Contact Address</span>}
                    >
                      <Input.TextArea placeholder="Contact address (optional)" rows={3} style={{ borderRadius: 10 }} />
                    </Form.Item>
                  </div>
                </Step>
              )}

              {/* Step 4: Data Privacy Agreement */}
              <Step>
                <div style={{ padding: '0 8px' }}>
                  <Typography.Title 
                    level={4} 
                    style={{ 
                      marginBottom: 12, 
                      color: "#e91e63",
                      fontSize: 17,
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <SafetyCertificateOutlined style={{ fontSize: 20 }} /> 
                    Data Privacy Agreement
                  </Typography.Title>
                  
                  <div style={{ 
                    maxHeight: '280px', 
                    overflowY: 'auto', 
                    padding: '16px', 
                    background: '#fafafa', 
                    borderRadius: 10,
                    border: '1px solid #e8e8e8',
                    marginBottom: 12,
                  }}>
                    <Typography.Title level={5} style={{ color: "#5227FF", marginBottom: 10, fontSize: 14 }}>
                      Data Privacy Act of 2012 - Republic Act No. 10173
                    </Typography.Title>
                    
                    <Typography.Paragraph style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 10 }}>
                      <strong>Privacy Notice:</strong> VAWCare is committed to protecting your personal information in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173) of the Philippines.
                    </Typography.Paragraph>
                    
                    <Typography.Paragraph style={{ fontSize: 12, marginTop: 10, marginBottom: 4 }}>
                      <strong style={{ color: "#e91e63" }}>What information we collect:</strong>
                    </Typography.Paragraph>
                    <ul style={{ paddingLeft: 18, marginTop: 2, marginBottom: 10 }}>
                      <li style={{ marginBottom: 2, fontSize: 11, lineHeight: 1.4 }}>Personal identification information (name, email, contact number)</li>
                      <li style={{ marginBottom: 2, fontSize: 11, lineHeight: 1.4 }}>Account credentials (username and encrypted password)</li>
                      <li style={{ marginBottom: 2, fontSize: 11, lineHeight: 1.4 }}>Incident reports and related information</li>
                      <li style={{ marginBottom: 2, fontSize: 11, lineHeight: 1.4 }}>Emergency contact information (optional)</li>
                      <li style={{ marginBottom: 2, fontSize: 11, lineHeight: 1.4 }}>Location data (optional, when you choose to share it)</li>
                    </ul>
                    
                    <Typography.Paragraph style={{ fontSize: 12, marginTop: 10, marginBottom: 4 }}>
                      <strong style={{ color: "#e91e63" }}>How we use your information:</strong>
                    </Typography.Paragraph>
                    <ul style={{ paddingLeft: 18, marginTop: 2, marginBottom: 10 }}>
                      <li style={{ marginBottom: 2, fontSize: 11, lineHeight: 1.4 }}>To provide assistance and support for VAWC cases</li>
                      <li style={{ marginBottom: 2, fontSize: 11, lineHeight: 1.4 }}>To facilitate communication with law enforcement</li>
                      <li style={{ marginBottom: 2, fontSize: 11, lineHeight: 1.4 }}>To maintain records for legal purposes</li>
                      <li style={{ marginBottom: 2, fontSize: 11, lineHeight: 1.4 }}>To improve our services and user experience</li>
                    </ul>
                    
                    <Typography.Paragraph style={{ fontSize: 12, marginTop: 10, marginBottom: 4 }}>
                      <strong style={{ color: "#e91e63" }}>Your rights under the Data Privacy Act:</strong>
                    </Typography.Paragraph>
                    <ul style={{ paddingLeft: 18, marginTop: 2, marginBottom: 10 }}>
                      <li style={{ marginBottom: 2, fontSize: 11, lineHeight: 1.4 }}>Right to be informed about data processing</li>
                      <li style={{ marginBottom: 2, fontSize: 11, lineHeight: 1.4 }}>Right to access your personal data</li>
                      <li style={{ marginBottom: 2, fontSize: 11, lineHeight: 1.4 }}>Right to correct inaccurate information</li>
                      <li style={{ marginBottom: 2, fontSize: 11, lineHeight: 1.4 }}>Right to erasure or blocking of data</li>
                      <li style={{ marginBottom: 2, fontSize: 11, lineHeight: 1.4 }}>Right to object to processing</li>
                      <li style={{ marginBottom: 2, fontSize: 11, lineHeight: 1.4 }}>Right to file a complaint with National Privacy Commission</li>
                    </ul>
                    
                    <Typography.Paragraph style={{ fontSize: 12, marginTop: 10, marginBottom: 4 }}>
                      <strong style={{ color: "#e91e63" }}>Data Security & Retention:</strong>
                    </Typography.Paragraph>
                    <Typography.Paragraph style={{ fontSize: 11, lineHeight: 1.4, marginBottom: 8 }}>
                      We implement appropriate security measures to protect your information. Data is retained only as long as necessary or as required by law.
                    </Typography.Paragraph>
                    
                    <Typography.Paragraph style={{ fontSize: 11, lineHeight: 1.4, marginBottom: 0 }}>
                      <strong>Contact:</strong> privacy@vawcare.ph
                    </Typography.Paragraph>
                  </div>
                  
                  <div style={{ 
                    padding: '12px', 
                    background: 'linear-gradient(135deg, #f0f5ff 0%, #fef0ff 100%)', 
                    borderRadius: 10, 
                    border: '2px solid #5227FF',
                    boxShadow: '0 4px 12px rgba(82, 39, 255, 0.1)',
                  }}>
                    <Checkbox 
                      checked={agreedToPrivacy} 
                      onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                      style={{ fontSize: 12, lineHeight: 1.4 }}
                    >
                      <strong style={{ color: '#5227FF', fontSize: 12 }}>I agree to the Data Privacy Act terms and conditions.</strong>
                    </Checkbox>
                  </div>
                </div>
              </Step>
            </Stepper>
            </Form>
            
            <div style={{ marginTop: 12, textAlign: "center" }}>
              <Typography.Text style={{ color: "#666", fontSize: 12 }}>
                Already have an account?{" "}
                <Link style={{ color: "#e91e63" }} to="/login">
                  Sign in
                </Link>
              </Typography.Text>
            </div>
          </div>
        </Card>
      </Flex>

      {/* Missing fields modal - shown when validation fails */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ExclamationCircleOutlined style={{ color: '#e91e63', fontSize: 20 }} />
            <div style={{ fontWeight: 800 }}>Almost there — a few details needed</div>
          </div>
        }
        open={showMissingModal}
        onCancel={() => setShowMissingModal(false)}
        width={520}
        footer={[
          <Button key="close" onClick={() => setShowMissingModal(false)}>Close</Button>,
          <Button
            key="review"
            type="primary"
            style={{
              background: 'linear-gradient(135deg, #5227FF 0%, #7A5AF8 100%)',
              border: 'none',
              borderRadius: 8,
              padding: '6px 14px',
              boxShadow: '0 6px 18px rgba(82,39,255,0.14)'
            }}
            onClick={() => {
              setShowMissingModal(false);
              if (missingFields && missingFields.length > 0) {
                const first = missingFields[0];
                const fieldToStep = {
                  username: 1,
                  victimType: 1,
                  email: 1,
                  password: 1,
                  confirmPassword: 1,
                  firstName: 2,
                  lastName: 2,
                  address: 2,
                  contactNumber: 2,
                  emergencyContactName: 3,
                  emergencyContactRelationship: 3,
                  emergencyContactNumber: 3,
                  emergencyContactEmail: 3,
                  emergencyContactAddress: 3,
                };
                const step = fieldToStep[first] || 1;
                setTimeout(() => {
                  try {
                    const indicators = document.querySelectorAll('.step-indicator');
                    if (indicators && indicators.length >= step) {
                      indicators[step - 1].click();
                    }
                  } catch (e) {}
                  try { form.scrollToField(first); } catch (e) {}
                }, 120);
              }
            }}
          >
            Review & fix
          </Button>
        ]}
      >
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <p style={{ marginBottom: 8, color: '#444' }}>
              We just need a couple more details to finish setting up your account. Tap "Review & fix" to go to the first missing field.
            </p>
            <ul style={{ marginTop: 6, paddingLeft: 18, listStyle: 'disc' }}>
              {missingFields && missingFields.length > 0 ? (
                missingFields.map((f) => {
                  const labels = {
                    username: 'Username',
                    victimType: 'Victim Category',
                    email: 'Email',
                    password: 'Password',
                    confirmPassword: 'Confirm Password',
                    firstName: 'First Name',
                    lastName: 'Last Name',
                    address: 'Address',
                    contactNumber: 'Contact Number',
                    emergencyContactName: 'Emergency Contact Name',
                    emergencyContactRelationship: 'Emergency Contact Relationship',
                    emergencyContactNumber: 'Emergency Contact Number',
                    emergencyContactEmail: 'Emergency Contact Email',
                    emergencyContactAddress: 'Emergency Contact Address',
                  };
                  const stepLabel = (f) => {
                    const map = { username: 1, victimType: 1, email: 1, password: 1, confirmPassword: 1, firstName: 2, lastName: 2, address: 2, contactNumber: 2, emergencyContactName: 3, emergencyContactRelationship: 3, emergencyContactNumber: 3, emergencyContactEmail: 3, emergencyContactAddress: 3 };
                    return map[f] ? `Step ${map[f]}` : '';
                  };
                  return (
                    <li key={f} style={{ marginBottom: 10, color: '#333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{labels[f] || f}</span>
                      {stepLabel(f) && <span style={{ color: '#888', fontSize: 12 }}>{`(Step ${stepLabel(f).split(' ')[1]})`}</span>}
                    </li>
                  );
                })
              ) : (
                <li>Required fields are missing</li>
              )}
            </ul>
          </div>
        </div>
      </Modal>

      {/* Success Registration Modal */}
      <Modal
        title={<div style={{ textAlign: 'center', fontWeight: 700 }}>Account Created</div>}
        open={showSuccessModal}
        centered
        width={420}
        onCancel={() => setShowSuccessModal(false)}
        footer={[
          <Button key="close" onClick={() => setShowSuccessModal(false)}>Close</Button>,
          <Button key="now" type="primary" onClick={() => {
            setShowSuccessModal(false);
            if (successRedirect) navigate(successRedirect);
          }}>Go to my dashboard</Button>
        ]}
      >
        <div style={{ textAlign: 'center', padding: '6px 6px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
          <Typography.Title level={4} style={{ marginBottom: 6 }}>You're all set</Typography.Title>
          <Typography.Paragraph style={{ color: '#666', marginBottom: 6 }}>
            Your account was created successfully.
          </Typography.Paragraph>
          <Typography.Paragraph style={{ color: '#666', marginBottom: 0 }}>
            We are finalizing your account. You will be redirected shortly — or click "Go to my dashboard" to continue now.
          </Typography.Paragraph>
        </div>
      </Modal>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.1);
          }
        }
        
        @keyframes bounce {
          0%, 80%, 100% {
            transform: translateY(0);
            opacity: 1;
          }
          40% {
            transform: translateY(-10px);
            opacity: 0.7;
          }
        }
        /* Highlight animation for fields navigated-to by the modal review action */
        .vawcare-highlight-target {
          box-shadow: 0 0 0 6px rgba(122,90,248,0.12) !important;
          transition: box-shadow 0.25s ease-in-out;
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
}
