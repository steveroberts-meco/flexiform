import { useState } from "react";
import { useForm } from "react-hook-form@7.55.0";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "motion/react";

interface FormData {
  name: string;
  email: string;
  reason: string;
  budget?: string;
  currentStage?: string;
  message: string;
}

// Initialize Supabase client
const supabaseUrl = "https://bklwkbfrvuhqodudgmdk.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrbHdrYmZydnVocW9kdWRnbWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MDY4NTcsImV4cCI6MjA4Nzk4Mjg1N30.tKtNdDRySruYKSaHszfCGZQQvgU6OeRS_ZpdoVR6BiA";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const reasons = [
  "UX / Conversion Audit",
  "Full Website Redesign",
  "Shopify Development",
  "Brand & Positioning",
  "Ongoing Retainer Support",
  "I'm looking for a mentor",
  "I need branding",
  "I just want to hire you",
  "Something else",
];

const budgets = [
  "Low",
  "£1k–£3k",
  "£3k–£7k",
  "£7k–£15k",
  "£15k+",
  "No Fixed Budget",
  "Not sure yet",
];

const stages = [
  "Early idea / pre-launch",
  "Existing site that needs improving",
  "Scaling and need optimisation",
  "Full redesign required",
  "I have a logo",
  "I'm lost and just need help",
  "I'm unsure",
];

export default function ContactForm() {
  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [direction, setDirection] = useState(1);

  const [formData, setFormData] = useState<Partial<FormData>>(
    {},
  );
  const [selectedReason, setSelectedReason] = useState("");
  const [selectedBudget, setSelectedBudget] = useState("");
  const [selectedStage, setSelectedStage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    getValues,
    watch,
  } = useForm<FormData>();

  // Watch form fields for real-time validation
  const nameValue = watch("name");
  const emailValue = watch("email");
  const messageValue = watch("message");

  // Check if Step 1 can proceed
  const canProceedStep1 =
    nameValue &&
    emailValue &&
    nameValue.length >= 2 &&
    /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(emailValue);

  // Step 5 is always ready to proceed (message is optional)
  const canProceedStep5 = true;

  const goToStep = (nextStep: number) => {
    setDirection(nextStep > step ? 1 : -1);
    setStep(nextStep);
  };

  const handleStep1Continue = async () => {
    const isValid = await trigger(["name", "email"]);
    if (isValid) {
      const values = getValues();
      setFormData({
        ...formData,
        name: values.name,
        email: values.email,
      });
      goToStep(2);
    }
  };

  const handleReasonSelect = (reason: string) => {
    setSelectedReason(reason);
    setFormData({ ...formData, reason });

    // If "Something else", skip to step 5
    setTimeout(() => {
      if (reason === "Something else") {
        goToStep(5);
      } else {
        goToStep(3);
      }
    }, 200);
  };

  const handleBudgetSelect = (budget: string) => {
    setSelectedBudget(budget);
    setFormData({ ...formData, budget });
    setTimeout(() => goToStep(4), 200);
  };

  const handleStageSelect = (stage: string) => {
    setSelectedStage(stage);
    setFormData({ ...formData, currentStage: stage });
    setTimeout(() => goToStep(5), 200);
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setErrorMessage("");

    const finalData = {
      name: formData.name,
      email: formData.email,
      reason: formData.reason,
      budget: formData.budget || null,
      current_stage: formData.currentStage || null,
      message: data.message,
    };

    // Only use mock mode in Figma-specific environments
    const isFigmaPreview = 
      window.location.hostname.includes('figma.com') ||
      window.location.hostname.includes('figma.site') ||
      window.location.hostname.includes('figmaiframepreview');

    console.log("🔍 Environment check:", {
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      isFigmaPreview,
      href: window.location.href
    });

    try {
      if (isFigmaPreview) {
        // Mock submission for Figma preview
        console.log("📋 [Figma Preview Mode] Form data that would be submitted:", finalData);
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsSubmitted(true);
        return;
      }

      console.log("📤 Submitting to Supabase:", finalData);

      // First, save to Supabase database with all fields
      const { data: insertedData, error: dbError } = await supabase
        .from("contact_form")
        .insert([finalData])
        .select();

      if (dbError) {
        console.error("❌ Database error:", dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }

      console.log("✅ Database insert successful:", insertedData);

      // Then, call the Edge Function to send email
      try {
        console.log("📧 Calling Edge Function...");
        const response = await fetch(
          `${supabaseUrl}/functions/v1/make-server-bc7634d5`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseAnonKey}`,
            },
            body: JSON.stringify({
              name: formData.name,
              email: formData.email,
              reason: formData.reason,
              budget: formData.budget || null,
              currentStage: formData.currentStage || null,
              message: data.message,
            }),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error("❌ Edge Function error:", errorText);
          // Don't throw error here - form was saved, email is optional
        } else {
          console.log("✅ Edge Function call successful");
        }
      } catch (emailError) {
        console.error("❌ Email sending error:", emailError);
        // Don't throw error here - form was saved, email is optional
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error("❌ Error submitting form:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to send message. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setIsSubmitted(false);
    setFormData({});
    setSelectedReason("");
    setSelectedBudget("");
    setSelectedStage("");
    setErrorMessage("");
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -300 : 300,
      opacity: 0,
    }),
  };

  return (
    <div className="bg-[#212121] flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-[1280px] px-4 md:px-12 lg:px-20 py-[100px]">
        {isSubmitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <CheckCircle2 className="w-16 h-16 text-[#D0221C] mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl mb-2 text-white">
              Message Sent!
            </h2>
            <p className="text-gray-300 text-base md:text-lg mb-6">
              Thank you for contacting me. I'll get back to you
              soon.
            </p>
            <button
              onClick={resetForm}
              className="text-[#D0221C] hover:text-white transition duration-200 underline text-base md:text-lg"
            >
              Send Another?
            </button>
          </motion.div>
        ) : (
          <div>
            <AnimatePresence mode="wait" custom={direction}>
              {/* Step 1: Name and Email */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-8 md:mb-12">
                    <h1 className="text-3xl md:text-5xl lg:text-6xl text-white mb-3">
                      Would like to work with me and co?
                    </h1>
                    <h2 className="text-xl md:text-3xl lg:text-4xl text-gray-400">
                      Let's start with your details
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-6">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm md:text-base mb-2 text-gray-300"
                      >
                        Name
                      </label>
                      <input
                        id="name"
                        type="text"
                        {...register("name", {
                          required: "Name is required",
                          minLength: {
                            value: 2,
                            message:
                              "Name must be at least 2 characters",
                          },
                        })}
                        className="w-full pb-2 md:pb-3 border-b-2 border-gray-600 focus:border-white outline-none transition bg-transparent text-white placeholder-gray-500 text-base md:text-lg"
                        placeholder="John Doe"
                      />
                      {errors.name && (
                        <p className="mt-1 text-sm text-red-400">
                          {errors.name.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm md:text-base mb-2 text-gray-300"
                      >
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        {...register("email", {
                          required: "Email is required",
                          pattern: {
                            value:
                              /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: "Invalid email address",
                          },
                        })}
                        className="w-full pb-2 md:pb-3 border-b-2 border-gray-600 focus:border-white outline-none transition bg-transparent text-white placeholder-gray-500 text-base md:text-lg"
                        placeholder="john@example.com"
                      />
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-400">
                          {errors.email.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleStep1Continue}
                    disabled={!canProceedStep1}
                    className={`py-3 md:py-4 px-6 md:px-8 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-md text-base md:text-lg ${
                      canProceedStep1
                        ? "bg-[#D0221C] hover:bg-[#B01D18] text-white cursor-pointer"
                        : "bg-gray-600 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </motion.div>
              )}

              {/* Step 2: Reason for contact */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-8 md:mb-12">
                    <h2 className="text-2xl md:text-4xl lg:text-5xl text-white mb-8">
                      Pick a reason for contacting me
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6">
                    {reasons.map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() =>
                          handleReasonSelect(reason)
                        }
                        className={`p-4 md:p-6 border-2 rounded-lg transition duration-200 text-left hover:border-white hover:bg-white/10 text-base md:text-lg ${
                          selectedReason === reason
                            ? "border-white bg-white/10 text-white"
                            : "border-gray-600 text-gray-300"
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => goToStep(1)}
                    className="py-3 md:py-4 px-6 md:px-8 rounded-lg transition duration-200 flex items-center justify-center gap-2 text-base md:text-lg border-2 border-gray-600 text-gray-300 hover:border-white hover:text-white"
                  >
                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                    <span>Back</span>
                  </button>
                </motion.div>
              )}

              {/* Step 3: Budget */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-8 md:mb-12">
                    <h2 className="text-2xl md:text-4xl lg:text-5xl text-white mb-8">
                      What's your budget?
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6">
                    {budgets.map((budget) => (
                      <button
                        key={budget}
                        type="button"
                        onClick={() =>
                          handleBudgetSelect(budget)
                        }
                        className={`p-4 md:p-6 border-2 rounded-lg transition duration-200 text-left hover:border-white hover:bg-white/10 text-base md:text-lg ${
                          selectedBudget === budget
                            ? "border-white bg-white/10 text-white"
                            : "border-gray-600 text-gray-300"
                        }`}
                      >
                        {budget}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => goToStep(2)}
                    className="py-3 md:py-4 px-6 md:px-8 rounded-lg transition duration-200 flex items-center justify-center gap-2 text-base md:text-lg border-2 border-gray-600 text-gray-300 hover:border-white hover:text-white"
                  >
                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                    <span>Back</span>
                  </button>
                </motion.div>
              )}

              {/* Step 4: Current stage */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-8 md:mb-12">
                    <h2 className="text-2xl md:text-4xl lg:text-5xl text-white mb-8">
                      Where are you currently at?
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-6">
                    {stages.map((stage) => (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => handleStageSelect(stage)}
                        className={`p-4 md:p-6 border-2 rounded-lg transition duration-200 text-left hover:border-white hover:bg-white/10 text-base md:text-lg ${
                          selectedStage === stage
                            ? "border-white bg-white/10 text-white"
                            : "border-gray-600 text-gray-300"
                        }`}
                      >
                        {stage}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => goToStep(3)}
                    className="py-3 md:py-4 px-6 md:px-8 rounded-lg transition duration-200 flex items-center justify-center gap-2 text-base md:text-lg border-2 border-gray-600 text-gray-300 hover:border-white hover:text-white"
                  >
                    <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                    <span>Back</span>
                  </button>
                </motion.div>
              )}

              {/* Step 5: Message */}
              {step === 5 && (
                <motion.div
                  key="step5"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3 }}
                  className="flex-1 flex flex-col"
                >
                  <div className="mb-8 md:mb-12">
                    <h2 className="text-2xl md:text-4xl lg:text-5xl text-white mb-8">
                      Anything you'd like to add?
                    </h2>
                  </div>

                  <form
                    onSubmit={handleSubmit(onSubmit)}
                    className="flex-1 flex flex-col"
                  >
                    <div className="mb-6">
                      <textarea
                        id="message"
                        rows={6}
                        {...register("message")}
                        className="w-full px-4 py-3 md:px-6 md:py-4 border-2 border-gray-600 rounded-lg focus:border-white outline-none transition resize-none bg-transparent text-white placeholder-gray-500 text-base md:text-lg"
                        placeholder="Tell me more about your project..."
                      />
                      {errors.message && (
                        <p className="mt-1 text-sm text-red-400">
                          {errors.message.message}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-3 md:gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          // Go back to appropriate step based on whether "Something else" was selected
                          if (
                            selectedReason === "Something else"
                          ) {
                            goToStep(2);
                          } else {
                            goToStep(4);
                          }
                        }}
                        className="py-3 md:py-4 px-6 md:px-8 rounded-lg transition duration-200 flex items-center justify-center gap-2 text-base md:text-lg border-2 border-gray-600 text-gray-300 hover:border-white hover:text-white"
                      >
                        <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
                        <span>Back</span>
                      </button>

                      <button
                        type="submit"
                        disabled={
                          isSubmitting || !canProceedStep5
                        }
                        className={`flex-1 py-3 md:py-4 px-6 md:px-8 rounded-lg transition duration-200 flex items-center justify-center gap-2 shadow-md text-base md:text-lg ${
                          canProceedStep5 && !isSubmitting
                            ? "bg-[#D0221C] hover:bg-[#B01D18] text-white cursor-pointer"
                            : "bg-gray-600 text-gray-400 cursor-not-allowed"
                        }`}
                      >
                        <span>
                          {isSubmitting
                            ? "Sending..."
                            : "Submit"}
                        </span>
                        <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                      </button>
                    </div>

                    {errorMessage && (
                      <p className="text-sm text-red-400 text-center mt-4">
                        {errorMessage}
                      </p>
                    )}
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}