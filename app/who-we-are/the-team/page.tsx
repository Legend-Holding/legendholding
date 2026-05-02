import React from 'react';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import Image from 'next/image';
import { PageBanner } from '@/components/page-banner';
import { Metadata } from 'next';
import { query } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Leadership Team | Legend Holding Group | Board of Directors & Management',
  description: 'Meet the leadership team of Legend Holding Group. Our board includes Kai Zheng (Founder & Chairman), Mira Wu (Co-Founder & Vice Chairman), Cannon Wang (VP Dealership & Strategy), Nagaraj Ponnada (General Manager), Rejeesh Raveendran (Group Finance Director), and Sonam Lama (Group HR Director). Our management team features Jade Li (Managing Director at Zul Energy), George Hua (Head of Commercial Vehicles), Tamer Khalil (Head of After Sales), Mohamed Baz (Head of Motorcycles), Shameel Wohadally (Head of Internal Audit), Waseem Khalayleh (Brand Manager), Xiaolong Ma (Branch Manager - KSA), Turki Altalhi (HR & Admin Manager - KSA), Sun Bo (Business Development Manager), and Pawan Rathi (General Manager at Legend Rent a Car).',
  keywords: 'Kai Zheng, Mira Wu, Cannon Wang, Nagaraj Ponnada, Rejeesh Raveendran, Sonam Lama, Jade Li, George Hua, Tamer Khalil, Mohamed Baz, Shameel Wohadally, Waseem Khalayleh, Xiaolong Ma, Turki Altalhi, Sun Bo, Pawan Rathi, Legend Holding Group leadership, board of directors, management team, Founder, Chairman, Vice Chairman, General Manager, UAE business leaders, automotive executives, energy sector leaders, technology directors, internal audit, HR manager, Saudi Arabia, KSA, Zul Energy, Legend Commercial Vehicles, Legend Motors, Legend Motorcycles, Legend Rent a Car',
  openGraph: {
    title: 'Leadership Team | Legend Holding Group',
    description: 'Meet the leadership team of Legend Holding Group. Our board includes Kai Zheng (Founder & Chairman), Mira Wu (Co-Founder & Vice Chairman), Cannon Wang, Nagaraj Ponnada, Rejeesh Raveendran, and Sonam Lama. Management team: Jade Li, George Hua, Tamer Khalil, Mohamed Baz, Shameel Wohadally, Waseem Khalayleh, Xiaolong Ma, Turki Altalhi, Sun Bo, and Pawan Rathi.',
    type: 'website',
    url: 'https://legendholding.com/who-we-are/the-team',
    images: [
      {
        url: 'https://res.cloudinary.com/dzfhqvxnf/image/upload/v1769687716/icon_job_cgk6cp.png',
        width: 1200,
        height: 630,
        alt: 'Legend Holding Group Leadership Team'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Leadership Team | Legend Holding Group',
    description: 'Meet the leadership team of Legend Holding Group. Learn about our board of directors and management team.',
    images: ['https://res.cloudinary.com/dzfhqvxnf/image/upload/v1769687716/icon_job_cgk6cp.png']
  },
  alternates: {
    canonical: 'https://legendholding.com/who-we-are/the-team'
  }
};

export const dynamic = 'force-dynamic';

import { TeamDisplay } from '@/components/team-display';

type TeamMember = {
  name: string;
  role: string;
  company: string;
  image: string;
  is_spotlight?: boolean;
  seo_description?: string;
  linkedin?: string;
};

const fallbackBoardData: TeamMember[] = [
  { name: "Kai Zheng", role: "Founder & Chairman", company: "Legend Holding Group", image: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1761054607/image_5_xtngrn.jpg", is_spotlight: true, seo_description: "Kai Zheng, Co-founder and Chairman of Legend Holding Group, is an expert entrepreneur with extensive experience in developing companies and a clear vision for the future of technologies.", linkedin: "https://www.linkedin.com/in/kai-zheng-96087698/" },
  { name: "Mira Wu", role: "Co-Founder & Vice Chairman", company: "Legend Holding Group", image: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1767593928/10_copy_2122_mssssq.png", is_spotlight: true, seo_description: "Mira Wu, Co-Founder and Vice Chairman of Legend Holding Group, is the executive leader of multiple businesses within the group, bringing over 20 years of experience across the region.", linkedin: "https://www.linkedin.com/in/mira-wu-7497001b2/" },
  { name: "Jonathan Stretton", role: "Chief Operating Officer", company: "Legend Holding Group", image: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1767682094/Jonathan_r7nqeh.png" },
  { name: "Cannon Wang", role: "VP Dealership & Strategy of LHG", company: "Legend Holding Group", image: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1761054569/8_copy_wxobcr.jpg" },
  { name: "Rejeesh Raveendran", role: "Group Finance Director", company: "Legend Holding Group", image: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1764740125/5_copy_lgomsk.png" },
  { name: "Nagaraj Ponnada", role: "General Manager", company: "Legend Holding Group", image: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1761054540/image_8_swwqoy.jpg" },
  { name: "Sonam Lama", role: "Group HR Director", company: "Legend Holding Group", image: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1764143856/sonam_2_hpe4ou.png" },
  { name: "Waseem Khalayleh", role: "Head of Brand", company: "Legend Holding Group", image: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1763818241/WhatsApp_Image_2025-06-20_at_12.082222_asqhsk.png" },
  { name: "Jade Li", role: "Managing Director", company: "Zul Energy", image: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1763817365/WhatsApp_Image_2025-06-20_at_12.08_1_ch0zex.png" },
  { name: "George Hua", role: "Head of Commercial Vehicles", company: "Legend Commercial Vehicles", image: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1761054559/3_copy_mxnwc7.jpg" },
  { name: "Tamer Khalil", role: "Head of After Sales", company: "Legend Auto Services", image: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1761054567/4_copy_upgmzf.jpg" },
  { name: "Sun Bo", role: "Business Development Manager", company: "Legend Holding Group", image: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1766139126/02_3_whojcm.png" },
  { name: "Pawan Rathi", role: "General Manager", company: "Legend Rent a Car", image: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1763818661/656_ynivxt.png" },
  { name: "Mohamed Baz", role: "Head of Motorcycles", company: "Legend Motorcycles", image: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1765196419/Mohammed_Baz_z7qv1o.png" },
  { name: "Shameel Wohadally", role: "Head of Internal Audit", company: "Legend Holding Group", image: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1767940725/Shameel_1_ylaowu.png" },
  { name: "Adrees Khan", role: "Corporate Tax Manager", company: "Legend Holding Group", image: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1767787617/Adrees_nz1qnp.png" },
];

const fallbackTeamData: TeamMember[] = [
  { name: "Xiaolong Ma", role: "Branch Manager", company: "Legend Holding Group - KSA", image: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1765351058/5_copy55_ccgw0y.png" },
  { name: "Turki Altalhi", role: "HR & Admin Manager", company: "Legend Holding Group - KSA", image: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1766219042/turki_KSA_aupdzs.png" },
];

const fallbackChinaData: TeamMember[] = [
  { name: "Junfu Gao", role: "General Manager of China Branch", company: "Legend Holding Group", image: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1764161813/4_copy_ukrn7s.png" },
  { name: "Xiaoya Zhao", role: "Deputy General Manager of China Branch", company: "Legend Holding Group", image: "https://res.cloudinary.com/dzfhqvxnf/image/upload/v1764144502/4_copy2_exbafg.png" },
];

async function fetchTeamData(): Promise<{ board: TeamMember[]; ksa: TeamMember[]; china: TeamMember[] }> {
  try {
    const result = await query(
      `SELECT name, role, company, image, category, sort_order, is_spotlight, seo_description, linkedin
       FROM team_members
       WHERE is_visible = true
       ORDER BY sort_order ASC`,
    );
    const data = result.rows;

    if (!data || data.length === 0) throw new Error("No data");

    const pick = (m: typeof data[number]): TeamMember => ({
      name: m.name,
      role: m.role,
      company: m.company,
      image: m.image,
      is_spotlight: m.is_spotlight ?? false,
      seo_description: m.seo_description ?? "",
      linkedin: m.linkedin ?? "",
    });

    return {
      board: data.filter((m) => m.category === "board").map(pick),
      ksa: data.filter((m) => m.category === "ksa").map(pick),
      china: data.filter((m) => m.category === "china").map(pick),
    };
  } catch {
    return {
      board: fallbackBoardData,
      ksa: fallbackTeamData,
      china: fallbackChinaData,
    };
  }
}

export default async function LeadershipTeam() {
  const { board: boardData, ksa: teamData, china: chinaData } = await fetchTeamData();

  const toSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

  // Structured data for SEO (Organization + WebPage + ItemList + Person with images and anchors)
  const pageUrl = 'https://legendholding.com/who-we-are/the-team';
  const bannerUrl = 'https://res.cloudinary.com/dzfhqvxnf/image/upload/v1761119956/cdn_684c1882b54a16.04269006_20250613_122434_vwphxo.jpg';

  const personFrom = (member: { name: string; role: string; company: string; image: string }, position?: number) => ({
    "@type": "Person",
    name: member.name,
    jobTitle: member.role,
    image: member.image,
    url: `${pageUrl}#${toSlug(`${member.name}-${member.role}`)}`,
    worksFor: {
      "@type": "Organization",
      name: member.company
    },
    ...(typeof position === 'number' ? { position } : {})
  });

  const organizationData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Legend Holding Group",
    url: "https://legendholding.com",
    logo: "https://legendholding.com/images/legend-logo.png",
    description: "Legend Holding Group is a diversified UAE holding company leading innovation in automotive, energy, tourism, and smart mobility across the Middle East & Africa.",
    address: {
      "@type": "PostalAddress",
      addressCountry: "AE",
      addressRegion: "UAE"
    },
    employee: [
      ...boardData.map((m) => personFrom(m)),
      ...teamData.map((m) => personFrom(m)),
      ...chinaData.map((m) => personFrom(m)),
    ]
  };

  const webPageData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: 'The Team',
    url: pageUrl,
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: bannerUrl,
      width: 1200,
      height: 630,
      caption: 'Legend Holding Group Leadership Team'
    },
    about: {
      "@type": "Organization",
      name: "Legend Holding Group",
      url: "https://legendholding.com"
    }
  };

  const itemListData = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: 'Legend Holding Group Leadership',
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: boardData.length + teamData.length + chinaData.length,
    itemListElement: [
      ...boardData.map((m, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: personFrom(m, index + 1)
      })),
      ...teamData.map((m, i) => ({
        "@type": "ListItem",
        position: boardData.length + i + 1,
        item: personFrom(m, boardData.length + i + 1)
      })),
      ...chinaData.map((m, i) => ({
        "@type": "ListItem",
        position: boardData.length + teamData.length + i + 1,
        item: personFrom(m, boardData.length + teamData.length + i + 1)
      }))
    ]
  };

  const allMembers = [...boardData, ...teamData, ...chinaData];
  const spotlightMembers = allMembers.filter((m) => m.is_spotlight);

  const keyLeadersData = spotlightMembers.map((m) => {
    const sameAs = ["https://legendholding.com"];
    if (m.linkedin) sameAs.push(m.linkedin);
    return {
      "@context": "https://schema.org",
      "@type": "Person",
      name: m.name,
      jobTitle: m.role,
      ...(m.seo_description ? { description: m.seo_description } : {}),
      worksFor: {
        "@type": "Organization",
        name: m.company,
        url: "https://legendholding.com"
      },
      url: `${pageUrl}#${toSlug(`${m.name}-${m.role}`)}`,
      image: m.image,
      sameAs,
    };
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListData) }} />
      {keyLeadersData.map((leaderData, index) => (
        <script key={`leader-${index}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(leaderData) }} />
      ))}
      <Header />
      <main className="pt-20">
        <PageBanner 
          title="The Team"
          imageUrl="https://res.cloudinary.com/dzfhqvxnf/image/upload/v1761119956/cdn_684c1882b54a16.04269006_20250613_122434_vwphxo.jpg"
        />
        <TeamDisplay teamData={teamData} boardData={boardData} chinaData={chinaData} />
        
        {/* Hidden SEO content — fully dynamic from database */}
        <div className="sr-only">
          <h1>Legend Holding Group Leadership Team</h1>
          <p>
            Meet the executive leadership team of Legend Holding Group, a diversified UAE holding company.
            {' '}Our leadership includes{' '}
            {allMembers.map((m, i) => (
              <React.Fragment key={i}>
                {i > 0 && (i === allMembers.length - 1 ? ', and ' : ', ')}
                {m.name} ({m.role})
              </React.Fragment>
            ))}.
            {' '}These experienced leaders drive innovation across automotive, energy, technology, and mobility sectors in the Middle East and Africa.
          </p>

          <h2>Board of Directors and Executive Leadership</h2>
          <p>
            {boardData.map((m, i) => (
              <React.Fragment key={i}>
                {m.seo_description
                  ? `${m.seo_description} `
                  : `${m.name} serves as ${m.role} at ${m.company}. `}
              </React.Fragment>
            ))}
          </p>

          {teamData.length > 0 && (
            <>
              <h2>KSA Leadership Team</h2>
              <p>
                {teamData.map((m, i) => (
                  <React.Fragment key={i}>
                    {m.seo_description
                      ? `${m.seo_description} `
                      : `${m.name} serves as ${m.role} at ${m.company}. `}
                  </React.Fragment>
                ))}
              </p>
            </>
          )}

          {chinaData.length > 0 && (
            <>
              <h2>China Branch Leadership</h2>
              <p>
                {chinaData.map((m, i) => (
                  <React.Fragment key={i}>
                    {m.seo_description
                      ? `${m.seo_description} `
                      : `${m.name} serves as ${m.role} at ${m.company}. `}
                  </React.Fragment>
                ))}
              </p>
            </>
          )}

          <h2>Complete Team Directory</h2>
          <ul>
            {allMembers.map((member, index) => (
              <li key={index}>
                <strong>{member.name}</strong> - {member.role} at {member.company}.
                {member.seo_description
                  ? ` ${member.seo_description}`
                  : ` ${member.name} is a key leader in the ${member.company} organization.`}
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}