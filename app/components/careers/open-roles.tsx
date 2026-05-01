"use client"

import { ArrowRight, Briefcase, Building2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export default function OpenRoles() {
  return (
    <div className="bg-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid md:grid-cols-2 gap-8 md:gap-16 items-end mb-20">
          {/* Content Side */}
          <div className="flex flex-col h-full">
            <div className="mb-8 mt-auto">
              <span className="text-[#EE8900] font-medium mb-2 block">Career Opportunities</span>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#2B1C48] mb-6 leading-tight">Shape Your Future With Us</h2>
              <p className="text-base md:text-lg text-gray-600">
                Join a team where innovation meets ambition. At Legend Holdings, we offer diverse opportunities across our portfolio of world-renowned brands, enabling you to make an impact while building an exceptional career.
              </p>
            </div>

            {/* Image Side - Now between heading and card in mobile view */}
            <div className="relative h-[300px] md:h-[500px] rounded-2xl overflow-hidden mb-8 md:hidden">
              <Image
                src="https://cdn.legendholding.com/images/cdn_684bcbb1411ca6.12573119_20250613_065649.jpg"
                alt="Office workspace"
                fill
                className="object-cover"
                priority
              />
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#2B1C48]/20 to-transparent" />
            </div>

            {/* Call to Action Cards */}
            <div className="bg-white rounded-2xl p-6 md:p-12 shadow-sm border border-[#5D376E]/10 hover:shadow-lg transition-all duration-300 group">
              <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8">
                <div className="flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-[#5D376E]/10 rounded-2xl group-hover:bg-[#5D376E]/20 transition-colors duration-300 flex-shrink-0">
                  <Briefcase className="w-8 h-8 md:w-10 md:h-10 text-[#5D376E]" />
                </div>

                <div className="flex-1">
                  <h3 className="text-2xl md:text-3xl font-bold text-[#2B1C48] mb-4">Explore Open Roles</h3>
                  <p className="text-base md:text-xl text-gray-600 mb-6 leading-relaxed">
                    Discover exciting career opportunities across our diverse industries and find the perfect role to advance
                    your career.
                  </p>
                  <Link 
                    href="/careers/jobs" 
                    className="inline-flex items-center px-6 md:px-8 py-3 md:py-4 bg-[#EE8900] text-white font-medium rounded-xl 
                    hover:bg-[#EE8900]/90 transition-all duration-300 ease-in-out
                    hover:shadow-[0_0_20px_rgba(238,137,0,0.3)] 
                    active:transform active:scale-[0.98] group"
                  >
                    <span className="text-base md:text-lg group-hover:translate-x-[2px] transition-transform duration-300">View Open Positions</span>
                    <ArrowRight className="ml-2 w-5 h-5 md:w-6 md:h-6 transform transition-transform duration-300 group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Image Side - Desktop only */}
          <div className="relative h-[300px] md:h-[500px] rounded-2xl overflow-hidden hidden md:block">
            <Image
              src="https://cdn.legendholding.com/images/cdn_69f486da0031e1.53498927_20260501_105626.webp"
              alt="Office workspace"
              fill
              className="object-cover"
              priority
            />
            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-[#2B1C48]/20 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  )
}
