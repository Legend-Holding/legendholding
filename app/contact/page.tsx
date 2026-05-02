"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import { motion } from "framer-motion"
import {
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import Link from "next/link"
import Newsletter from "@/components/newsletter"
import { PageBanner } from "@/components/page-banner"

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formStep, setFormStep] = useState(0)
  const [honeypot, setHoneypot] = useState("")
  const formLoadedAt = useRef(Date.now())

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      console.log('Submitting form data:', formData)
      
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          _hp: honeypot,
          _ts: formLoadedAt.current,
        }),
      })

      const data = await response.json()
      console.log('Response:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit form')
      }

      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      })
      setHoneypot("")
      formLoadedAt.current = Date.now()
      
      toast.success("Thank you for submitting your form, We will contact you shortly.")
      setFormStep(1)
    } catch (error: any) {
      console.error("Error submitting form:", error)
      toast.error(error.message || "Failed to submit form. Please try again later.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    })
    setHoneypot("")
    formLoadedAt.current = Date.now()
    setFormStep(0)
  }

  const contactInfo = [
    {
      icon: <Phone className="w-6 h-6" />,
      title: "Phone",
      details: ["+971 4 234 0738"],
      color: "text-[#EE8900]"
    },
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Email",
      details: ["hello@legendholding.com"],
      color: "text-[#EE8900]"
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: "Address",
      details: [
        "Legend Holding Group HQ, Jebel Ali Freezone Gate 5, Dubai, United Arab Emirates"
      ],
      color: "text-[#EE8900]"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Business Hours",
      details: ["Monday - Saturday  : 9:00 AM - 6:00 PM"],
      color: "text-[#EE8900]"
    }
  ]

  return (
    <>
      <Header />
      <main className="pt-20">
        <PageBanner 
          title="Contact Us"
          imageUrl="https://cdn.legendholding.com/images/cloudinary/cloudinary_683ea90f29b708.04231409_20250603_074935.jpg"
        />

        {/* Main Contact Section */}
        <section className="bg-slate-100 py-16 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="px-2 sm:px-0">
              <h1 className="text-4xl font-bold text-[#5D376E] mb-2">Get in Touch</h1>
              <p className="text-lg text-gray-600 mb-6">
                Visit our office or reach out to us through any of the following channels.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-stretch w-full">
              {/* Left Side - Map and Contact Info */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col order-2 lg:order-1 w-full">
                <div className="mb-4">
                  <span className="text-[#2B1C48] font-semibold text-lg inline-block mb-2">Our Location</span>
                  <h3 className="text-2xl font-bold text-[#5D376E] mb-2">Visit Our Office</h3>
                  <div className="w-16 h-1 bg-[#EE8900] rounded-full mb-4"></div>
                </div>

                {/* Contact Info Cards */}
                <div className="grid grid-cols-1 gap-4">
                  {contactInfo.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:shadow-lg transition-all duration-300 group"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`${item.color} group-hover:scale-110 transition-transform duration-300 mt-0.5 flex-shrink-0`}>
                          {item.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-[#5D376E] mb-1">{item.title}</h3>
                          <div className="-space-y-1">
                            {item.details.map((detail, idx) => (
                              <p key={idx} className="text-sm text-gray-600 leading-tight break-words break-all sm:break-normal">
                                {detail}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Get Directions Button */}
                <div className="mt-4">
                  <a
                    href="https://www.google.com/maps/search/?api=1&query=Legend+Holding+Group+Jebel+Ali+Freezone+Gate+5+Dubai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#F08900] text-white font-semibold rounded-lg hover:bg-[#d67a00] transition-colors duration-300 w-full"
                  >
                    <span>Get Directions</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Right Side - Contact Form */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm flex flex-col order-1 lg:order-2 w-full">
                <div className="mb-4">
                  <span className="text-[#2B1C48] font-semibold text-lg inline-block mb-2">Contact Us</span>
                  <h3 className="text-2xl font-bold text-[#5D376E] mb-2">Fill the Form</h3>
                  <div className="w-16 h-1 bg-[#EE8900] rounded-full mb-4"></div>
                </div>

                {formStep === 0 ? (
                  <form onSubmit={handleSubmit} className="space-y-3 flex-grow">
                    <div className="absolute opacity-0 top-0 left-0 h-0 w-0 -z-10" aria-hidden="true" tabIndex={-1}>
                      <label htmlFor="contact_website_url">Website</label>
                      <input
                        type="text"
                        id="contact_website_url"
                        name="website_url"
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                        autoComplete="off"
                        tabIndex={-1}
                      />
                    </div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0 * 0.1, duration: 0.5 }}
                    >
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        placeholder="Your full name"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#EE8900] focus:border-transparent transition-all duration-200"
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 1 * 0.1, duration: 0.5 }}
                    >
                      <div className="relative">
                        <Mail className="absolute left-3 top-2 w-4 h-4 text-gray-400" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          placeholder="Your email"
                          className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#EE8900] focus:border-transparent transition-all duration-200"
                        />
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 2 * 0.1, duration: 0.5 }}
                      className="flex gap-2"
                    >
                      <select className="w-20 px-2 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#EE8900] focus:border-transparent">
                        <option value="+971">+971</option>
                        <option value="+1">+1</option>
                        <option value="+44">+44</option>
                        <option value="+91">+91</option>
                      </select>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="Phone number"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#EE8900] focus:border-transparent transition-all duration-200"
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 3 * 0.1, duration: 0.5 }}
                    >
                      <input
                        type="text"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        placeholder="Subject"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#EE8900] focus:border-transparent transition-all duration-200"
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 4 * 0.1, duration: 0.5 }}
                      className="flex-grow"
                    >
                      <textarea
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        placeholder="How can we help?"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#EE8900] focus:border-transparent transition-all duration-200 min-h-[195px] resize-none"
                      />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 5 * 0.1, duration: 0.5 }}
                      className="mt-auto"
                    >
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`
                          w-full bg-[#F08900] hover:bg-[#d67a00] text-white py-3 rounded-lg
                          transition-all duration-200 font-semibold text-base
                          ${isSubmitting ? "opacity-70 cursor-not-allowed" : ""}
                        `}
                      >
                        {isSubmitting ? (
                          <div className="flex items-center justify-center">
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Submitting...
                          </div>
                        ) : (
                          "Submit"
                        )}
                      </button>
                    </motion.div>
                  </form>
                ) : (
                  <div className="text-center py-8 flex-grow flex flex-col">
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-semibold text-gray-900 mb-2">Message Sent Successfully!</h3>
                    <p className="text-lg text-gray-600 mb-6">
                      Thank you for submitting your form, We will contact you shortly.
                    </p>
                    <div className="mt-auto">
                      <button
                        onClick={resetForm}
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#F08900] text-white font-semibold rounded-lg hover:bg-[#d67a00] transition-colors duration-300 w-full"
                      >
                        Send Another Message
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Newsletter Component */}
        <Newsletter />
      </main>
      <Footer />
    </>
  )
}