"use client"
 
import { useState, useEffect } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"
import Image from "next/image"
 
const dealerships = [
  {
    name: "212",
    image: "https://cdn.legendholding.com/images/cloudinary/cloudinary_683da1530dd2f0.90644648_20250602_130419.jpg",
    logo: "https://cdn.legendholding.com/images/cdn_68624d052a08a8.28527944_20250630_083829.png",
    description:
      "Legend Motors is the exclusive distributor for 212 vehicles in the UAE, managing both sales and after-sales service with a commitment to excellence.",
    detailedContent: [
      "Legend Motors is expanding its automotive partnerships, recently adding 212 Brand in the Dealerships, serving as the exclusive importer and managing both sales and after-sales services with a strong commitment to excellence.",
      "With an upcoming first showroom, this model is projected to achieve rapid growth in its first year, targeting adventure-seekers looking for a vehicle built to go anywhere."
    ],
    imagePosition: "35% center",
    website: "https://212uae.com/",
  },
  {
    name: "Kaiyi",
    image: "https://cdn.legendholding.com/images/cloudinary/cloudinary_683da11c9c3534.33669103_20250602_130324.jpg",
    logo: "https://cdn.legendholding.com/images/cdn_68624b81b7f878.17468982_20250630_083201.png",
    description:
      "Legend Motors is the exclusive distributor of Kaiyi Automobiles in the UAE, proudly introducing this innovative Chinese SUV brand to the local market.",
    detailedContent: [
      "KAIYI Dealership is the exclusive dealership of Kaiyi in the UAE.",
      "Offering various models, the dealership has seen consistent growth, achieving a %54 increase in sales across both retail and fleet segments.",
      "Our first flagship showroom in Dubai, along with an upcoming location in Abu Dhabi, is featured within the Legend brand space, offering customers exceptional sales and aftersales service experiences.",
    ],
    imagePosition: "50% center",
    website: "https://kaiyi.ae/",
  },
  {
    name: "Skywell",
    image: "https://cdn.legendholding.com/images/cloudinary/cloudinary_683da0668d4af4.97651620_20250602_130022.jpg",
    logo: "https://cdn.legendholding.com/images/cdn_68624b1e8f5a30.76588960_20250630_083022.png",
    description:
      "Legend Motors is the exclusive distributor of Skywell vehicles in Dubai, offering comprehensive retail and fleet solutions across the emirate.",
    detailedContent: [
      "Legend Motors is the exclusive distributor of Skywell vehicles in UAE, offering comprehensive retail and fleet solutions across the emirate.",
      "With a strong focus on expansion, the company is actively growing its presence through the launch of multiple new showrooms in Abu Dhabi and other key locations across the country."
    ],
    imagePosition: "70% center",
    website: "https://skywell-uae.com/",
  },
  
  
]
 
export default function LegendMotorsDealershipPage() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
 
  useEffect(() => {
    setIsLoaded(true)
  }, [])
 
  return (
    <>
      <Header />
      <main className="min-h-screen bg-white relative overflow-hidden pt-20">
        <div className="relative z-10 flex flex-col items-center py-12 px-4">
          <div
            className={`w-full max-w-6xl transition-all duration-1000 ${
              isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            {/* Page Header */}
            <section className="w-full mb-16 animate-fade-in-up">
              <h2 className="text-2xl md:text-3xl font-semibold text-[#2b1c48] mb-6 font-richmond animation-delay-200">
                Legend Dealerships
              </h2>
              <div className="flex gap-2">
                <div className="h-1 w-16 bg-[#2b1c48] rounded-full animate-expand-width"></div>
                <div className="h-1 w-8 bg-[#ee8900] rounded-full animate-expand-width animation-delay-200"></div>
              </div>
 
              <p className="mt-8 text-gray-700 text-lg font-effra">
                Legend Motors represents premium automotive brands across the UAE, providing exceptional sales, service,
                and support for our valued customers. Explore our exclusive dealership portfolio below.
              </p>
            </section>
 
            {/* Dealership Sections */}
            <section className="w-full space-y-12 mb-16">
              {dealerships.map((dealership, idx) => (
                <div
                  key={dealership.name}
                  className={`bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden transition-all duration-500 hover:shadow-3xl animate-fade-in-up`}
                  style={{ animationDelay: `${(idx + 1) * 200}ms` }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Image/Logo */}
                    <div className="md:w-2/5 relative group overflow-hidden">
                      <div className="h-[300px] md:h-full w-full relative overflow-hidden">
                        <Image
                          src={dealership.image || "/placeholder.svg"}
                          alt={`${dealership.name} vehicle`}
                          fill
                          className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
                          style={{ objectPosition: dealership.imagePosition }}
                          priority={idx < 2}
                          loading={idx >= 2 ? "lazy" : undefined}
                          sizes="(max-width: 768px) 100vw, 40vw"
                          quality={85}
                          placeholder="blur"
                          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#2b1c48]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      </div>
 
                      {/* Logo overlay - standardized size with transparent background */}
                      <div
                        className="absolute bottom-4 right-4 p-3 transform transition-transform duration-300 group-hover:scale-110"
                        style={{
                          width: "140px",
                          height: "60px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Image
                          src={dealership.logo || "/placeholder.svg"}
                          alt={`${dealership.name} logo`}
                          width={120}
                          height={40}
                          className="max-h-10 max-w-full object-contain object-center"
                          quality={85}
                        />
                      </div>
                    </div>
 
                    {/* Text Content */}
                    <div className="flex-1 p-8 md:p-10 flex flex-col justify-center relative">
                      <h3 className="text-3xl font-richmond font-bold text-[#2b1c48] mb-4 group-hover:text-[#5d376e] transition-colors duration-300">
                        {dealership.name}
                      </h3>
                      
                      {/* Render detailed content for all dealerships */}
                      {dealership.detailedContent ? (
                        <div className="space-y-4 mb-6">
                          {dealership.detailedContent.map((paragraph, index) => (
                            <p key={index} className="text-lg font-effra text-gray-700 leading-relaxed">
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-lg font-effra text-gray-700 mb-6 leading-relaxed">{dealership.description}</p>
                      )}
 
                      {/* CTA Button */}
                      <div className="mt-6 w-full">
                        {dealership.website ? (
                          <a
                            href={dealership.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 text-white font-semibold bg-[#F08900] hover:bg-[#d67a00] transition-colors duration-300 cursor-pointer rounded-lg px-6 py-2"
                          >
                            <span>Visit Website</span>
                            <ChevronRight
                              className={`w-4 h-4 transform transition-transform duration-300 ${
                                activeIndex === idx ? "translate-x-1" : ""
                              }`}
                            />
                          </a>
                        ) : (
                          <button
                            className="inline-flex items-center justify-center gap-2 text-white font-semibold bg-[#F08900] hover:bg-[#d67a00] transition-colors duration-300 cursor-pointer rounded-lg px-6 py-2"
                            disabled
                          >
                            <span>Visit Website</span>
                            <ChevronRight
                              className={`w-4 h-4 transform transition-transform duration-300 ${
                                activeIndex === idx ? "translate-x-1" : ""
                              }`}
                            />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
 
 