/* eslint-disable no-console */
const { createClient } = require("@supabase/supabase-js")

const FEATURED = [
  {
    slug: "kai-zheng",
    name: "Kai Zheng",
    designation: "Founder & Chairman",
    company: "Legend Holding Group",
    photo: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1770205702/KAI_u2nbdv.png",
    email: "kai@legendholding.com",
    whatsapp: "971504837940",
    linkedin: "https://www.linkedin.com/in/kai-zheng-96087698/",
    website: "https://www.legendholding.com",
    legacy_slug: "Kai",
    sort_order: 1,
  },
  {
    slug: "mira-wu",
    name: "Mira Wu",
    designation: "Co-Founder & Vice Chairman",
    company: "Legend Holding Group",
    photo: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1770108401/%D9%84%D8%A7%D9%89_nqk2ki.png",
    email: "mira.wu@legendholding.com",
    whatsapp: "971566501676",
    linkedin: "https://www.linkedin.com/in/mira-wu-7497001b2/",
    website: "https://www.legendholding.com",
    legacy_slug: "Mira",
    sort_order: 2,
  },
  {
    slug: "cannon-wang",
    name: "Cannon Wang",
    designation: "VP Dealership & Strategy of LHG",
    company: "Legend Holding Group",
    photo: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1770205702/3_k6nv6n.png",
    email: "cannon.wang@legendmotorsuae.com",
    whatsapp: "971501451556",
    linkedin: "https://www.linkedin.com/in/cannon-wang-55649b118/",
    website: "https://www.legendholding.com",
    sort_order: 3,
  },
  {
    slug: "jonathan-stretton",
    name: "Jonathan Stretton",
    designation: "Chief Operating Officer",
    company: "Legend Holding Group",
    photo: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1770205701/4_jqudjk.png",
    email: "jonathan.stretton@legendholding.com",
    whatsapp: "97156881623",
    linkedin: "https://www.linkedin.com/in/jonathan-stretton-aa370a48/",
    website: "https://www.legendholding.com",
    sort_order: 4,
  },
  {
    slug: "nagaraj-ponnada",
    name: "Nagaraj Ponnada",
    designation: "General Manager",
    company: "Legend Holding Group",
    photo: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1770205702/2_p7whcx.png",
    email: "nagaraj.p@legendmotorsuae.com",
    whatsapp: "971506720814",
    linkedin: "https://www.linkedin.com/in/nagarajforgrowth/",
    website: "https://www.legendholding.com",
    legacy_slug: "nagaraj",
    sort_order: 5,
  },
  {
    slug: "rejeesh-raveendran",
    name: "Rejeesh Raveendran",
    designation: "Group Finance Director",
    company: "Legend Holding Group",
    photo: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1770205701/1_twihoy.png",
    email: "rejeesh.pillai@legendholding.com",
    whatsapp: "971564802082",
    linkedin: "https://www.linkedin.com/in/rejeesh-r-pillai-820b4423b/",
    website: "https://www.legendholding.com",
    sort_order: 6,
  },
  {
    slug: "waseem-khalayleh",
    name: "Waseem Khalayleh",
    designation: "Head of Brand",
    company: "Legend Holding Group",
    photo: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1770205703/5_ohvtkk.png",
    email: "waseem.k@legendholding.com",
    whatsapp: "971549964549",
    linkedin: "https://www.linkedin.com/in/waseem-khalayleh-96b8a780/",
    website: "https://www.legendholding.com",
    sort_order: 7,
  },
]

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  for (const profile of FEATURED) {
    const { error } = await supabase.from("management_profiles").upsert(profile, {
      onConflict: "slug",
    })
    if (error) {
      throw new Error(`Failed for ${profile.slug}: ${error.message}`)
    }
    console.log(`[restore-featured] restored ${profile.slug}`)
  }

  console.log("[restore-featured] done")
}

main().catch((err) => {
  console.error("[restore-featured] failed:", err.message || err)
  process.exit(1)
})
