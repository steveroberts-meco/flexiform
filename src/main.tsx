import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { useForm } from "react-hook-form";
import { CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "motion/react";
import "./index.css";

const supabaseUrl = "https://bklwkbfrvuhqodudgmdk.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrbHdrYmZydnVocW9kdWRnbWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MDY4NTcsImV4cCI6MjA4Nzk4Mjg1N30.tKtNdDRySruYKSaHszfCGZQQvgU6OeRS_ZpdoVR6BiA";

declare global {
  // eslint-disable-next-line no-var
  var __supabase: ReturnType<typeof createClient> | undefined;
}
if (!globalThis.__supabase) {
  globalThis.__supabase = createClient(supabaseUrl, supabaseAnonKey);
}
const supabase = globalThis.__supabase;

interface FormData {
  name: string;
  email: string;
  reason: string;
  budget?: string;
  currentStage?: string;
  message: string;
}

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

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
};

function App() {
  const [step, setStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [direction, setDirection] = useState(1);
  const [savedData, setSavedData] = useState<Partial<FormData>>({});
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
    reset,
  } = useForm<FormData>();

  const nameValue = watch("name");
  const emailValue = watch("email");

  const canProceedStep1 =
    nameValue &&
    emailValue &&
    nameValue.length >= 2 &&
    /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(emailValue);

  const goToStep = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setStep(next);
  };

  const handleStep1Continue = async () => {
    const valid = await trigger(["name", "email"]);
    if (valid) {
      const values = getValues();
      setSavedData((d) => ({ ...d, name: values.name, email: values.email }));
      goToStep(2);
    }
  };

  const handleReasonSelect = (reason: string) => {
    setSelectedReason(reason);
    setSavedData((d) => ({ ...d, reason }));
    setTimeout(() => goToStep(reason === "Something else" ? 5 : 3), 200);
  };

  const handleBudgetSelect = (budget: string) => {
    setSelectedBudget(budget);
    setSavedData((d) => ({ ...d, budget }));
    setTimeout(() => goToStep(4), 200);
  };

  const handleStageSelect = (stage: string) => {
    setSelectedStage(stage);
    setSavedData((d) => ({ ...d, currentStage: stage }));
    setTimeout(() => goToStep(5), 200);
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setErrorMessage("");

    const payload = {
      name: savedData.name,
      email: savedData.email,
      reason: savedData.reason,
      budget: savedData.budget ?? null,
      current_stage: savedData.currentStage ?? null,
      message: data.message,
    };

    const isFigmaPreview =
      window.location.hostname.includes("figma.com") ||
      window.location.hostname.includes("figma.site") ||
      window.location.hostname.includes("figmaiframepreview");

    try {
      if (isFigmaPreview) {
        await new Promise((r) => setTimeout(r, 800));
        setIsSubmitted(true);
        return;
      }

      const { error: dbError } = await supabase
        .from("contact_form")
        .insert([payload]);

      if (dbError) throw new Error(dbError.message);

      try {
        await fetch(`${supabaseUrl}/functions/v1/make-server-bc7634d5`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            name: savedData.name,
            email: savedData.email,
            reason: savedData.reason,
            budget: savedData.budget ?? null,
            currentStage: savedData.currentStage ?? null,
            message: data.message,
          }),
        });
      } catch {
        // email is non-critical — form was saved
      }

      setIsSubmitted(true);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to send. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setIsSubmitted(false);
    setSavedData({});
    setSelectedReason("");
    setSelectedBudget("");
    setSelectedStage("");
    setErrorMessage("");
    reset();
  };

  const backBtn = (to: number) => (
    <button
      type="button"
      onClick={() => goToStep(to)}
      className="py-3 px-6 md:py-4 md:px-8 rounded-full border-2 border-gray-600 text-gray-300 hover:border-white hover:text-white transition-colors duration-200 flex items-center gap-2 text-base md:text-lg"
    >
      <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
      <span>Back</span>
    </button>
  );

  const selectionGrid = (
    items: string[],
    selected: string,
    onSelect: (v: string) => void,
    cols: string,
  ) => (
    <div className={`grid ${cols} gap-3 md:gap-4 mb-8`}>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onSelect(item)}
          className={`p-4 md:p-5 border-2 rounded-none text-left transition-colors duration-150 text-sm md:text-base leading-snug ${
            selected === item
              ? "border-white bg-white/10 text-white"
              : "border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white hover:bg-white/5"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#212121] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-5xl px-0 sm:px-6 lg:px-12 py-16 sm:py-20">
        {isSubmitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="text-center py-12"
          >
            <CheckCircle2 className="w-16 h-16 text-[#4C9B9A] mx-auto mb-5" />
            <h2 className="text-2xl md:text-4xl text-white mb-3 font-light tracking-tight">
              Message sent.
            </h2>
            <p className="text-gray-400 text-base md:text-lg mb-8 max-w-sm mx-auto">
              Thanks for reaching out — I'll get back to you shortly.
            </p>
            <button
              onClick={resetForm}
              className="text-[#4C9B9A] hover:text-white transition-colors duration-200 underline underline-offset-4 text-base"
            >
              Send another message
            </button>
          </motion.div>
        ) : (
          <div className="overflow-hidden">
            <AnimatePresence mode="wait" custom={direction}>
              {step === 1 && (
                <motion.div
                  key="step1"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                >
                  <div className="mb-10 md:mb-14">
                    <h1 className="text-3xl sm:text-5xl lg:text-6xl text-white font-light tracking-tight leading-tight mb-3">
                      <span className="font-bold">Have something in mind?</span>
                      <br />
                      <span className="text-2xl sm:text-4xl lg:text-5xl text-gray-400">
                        Would like to work with me?
                      </span>
                    </h1>
                    <p className="text-lg sm:text-2xl text-gray-400">
                      Let's start with your details
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-10 mb-8">
                    <div>
                      <label
                        htmlFor="name"
                        className="block text-sm text-gray-400 mb-2 tracking-wide uppercase"
                      >
                        Name
                      </label>
                      <input
                        id="name"
                        type="text"
                        {...register("name", {
                          required: "Name is required",
                          minLength: { value: 2, message: "At least 2 characters" },
                        })}
                        className="w-full pb-3 border-b-2 border-gray-600 focus:border-white outline-none transition-colors duration-200 bg-transparent text-white placeholder-gray-600 text-lg"
                        placeholder="Your name"
                        autoComplete="name"
                      />
                      {errors.name && (
                        <p className="mt-2 text-sm text-red-400">{errors.name.message}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm text-gray-400 mb-2 tracking-wide uppercase"
                      >
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        {...register("email", {
                          required: "Email is required",
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: "Invalid email address",
                          },
                        })}
                        className="w-full pb-3 border-b-2 border-gray-600 focus:border-white outline-none transition-colors duration-200 bg-transparent text-white placeholder-gray-600 text-lg"
                        placeholder="your@email.com"
                        autoComplete="email"
                      />
                      {errors.email && (
                        <p className="mt-2 text-sm text-red-400">{errors.email.message}</p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleStep1Continue}
                    disabled={!canProceedStep1}
                    className={`py-3 px-7 md:py-4 md:px-9 rounded-full transition-colors duration-200 flex items-center gap-2 text-base md:text-lg font-medium ${
                      canProceedStep1
                        ? "bg-[#4C9B9A] hover:bg-[#3a7f7e] text-white cursor-pointer"
                        : "bg-gray-700 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Continue
                    <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                  </button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                >
                  <div className="mb-8 md:mb-12">
                    <h2 className="text-2xl sm:text-4xl lg:text-5xl text-white font-light tracking-tight">
                      Pick a reason for reaching out
                    </h2>
                  </div>

                  {selectionGrid(
                    reasons,
                    selectedReason,
                    handleReasonSelect,
                    "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
                  )}

                  {backBtn(1)}
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                >
                  <div className="mb-8 md:mb-12">
                    <h2 className="text-2xl sm:text-4xl lg:text-5xl text-white font-light tracking-tight">
                      What's your budget?
                    </h2>
                  </div>

                  {selectionGrid(
                    budgets,
                    selectedBudget,
                    handleBudgetSelect,
                    "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
                  )}

                  {backBtn(2)}
                </motion.div>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                >
                  <div className="mb-8 md:mb-12">
                    <h2 className="text-2xl sm:text-4xl lg:text-5xl text-white font-light tracking-tight">
                      Where are you currently at?
                    </h2>
                  </div>

                  {selectionGrid(
                    stages,
                    selectedStage,
                    handleStageSelect,
                    "grid-cols-1 sm:grid-cols-2",
                  )}

                  {backBtn(3)}
                </motion.div>
              )}

              {step === 5 && (
                <motion.div
                  key="step5"
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                >
                  <div className="mb-8 md:mb-12">
                    <h2 className="text-2xl sm:text-4xl lg:text-5xl text-white font-light tracking-tight">
                      Anything you'd like to add?
                    </h2>
                  </div>

                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="mb-6">
                      <textarea
                        rows={6}
                        {...register("message")}
                        className="w-full px-4 py-4 border-2 border-gray-600 rounded-lg focus:border-white outline-none transition-colors duration-200 resize-none bg-transparent text-white placeholder-gray-600 text-base md:text-lg"
                        placeholder="Tell me more about your project..."
                      />
                    </div>

                    <div className="flex gap-3 md:gap-4">
                      {backBtn(selectedReason === "Something else" ? 2 : 4)}

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`flex-1 py-3 px-6 md:py-4 md:px-8 rounded-full transition-colors duration-200 flex items-center justify-center gap-2 text-base md:text-lg font-medium ${
                          !isSubmitting
                            ? "bg-[#4C9B9A] hover:bg-[#3a7f7e] text-white cursor-pointer"
                            : "bg-gray-700 text-gray-500 cursor-not-allowed"
                        }`}
                      >
                        {isSubmitting ? "Sending..." : "Send message"}
                        {!isSubmitting && (
                          <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                        )}
                      </button>
                    </div>

                    {errorMessage && (
                      <div className="mt-4 text-center">
                        <p className="text-sm text-red-400">{errorMessage}</p>
                        <p className="text-sm text-gray-400 mt-1">
                          Please email us directly at{" "}
                          <a
                            href="mailto:mail@meandcollective.com"
                            className="text-white underline underline-offset-4 hover:text-[#4C9B9A] transition-colors duration-200"
                          >
                            mail@meandcollective.com
                          </a>
                        </p>
                      </div>
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

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
