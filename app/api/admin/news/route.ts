import { createClient } from "@supabase/supabase-js";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function requireAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { error: NextResponse.json({ error: "Server config error" }, { status: 500 }), supabase: null };
  }
  const cookieStore = await cookies();
  const supabaseAuth = createRouteHandlerClient({ cookies: () => cookieStore });
  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), supabase: null };
  }
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return { error: null, supabase };
}

export async function GET(request: Request) {
  const { error, supabase } = await requireAdmin();
  if (error) return error;

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = parseInt(url.searchParams.get("limit") || "10");

  const { count } = await supabase!
    .from("news_articles")
    .select("*", { count: "exact", head: true });

  const { data: articles, error: fetchError } = await supabase!
    .from("news_articles")
    .select("*")
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const articlesWithImages = await Promise.all(
    (articles || []).map(async (article) => {
      try {
        const { data: images } = await supabase!
          .from("news_article_images")
          .select("*")
          .eq("article_id", article.id)
          .order("image_order", { ascending: true });
        return { ...article, images: images || [] };
      } catch {
        return { ...article, images: [] };
      }
    })
  );

  return NextResponse.json({ articles: articlesWithImages, total: count || 0 });
}
