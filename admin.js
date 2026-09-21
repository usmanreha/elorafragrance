const db = window.eloraSupabase;
let editingId = null;
const $ = id => document.getElementById(id);
const msg = (id, text) => { $(id).textContent = text || ""; };
const esc = v => String(v ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const money = n => `Rs. ${Number(n || 0).toLocaleString("en-PK")}`;

async function checkSession() {
  const { data: { session } } = await db.auth.getSession();
  if (session) await showDashboard(session);
}

async function showDashboard(session) {
  $("loginBox").hidden = true;
  $("dashboard").hidden = false;
  $("userEmail").textContent = session.user.email || "";
  const { data: isAdmin, error } = await db.rpc("is_admin");
  if (error || !isAdmin) {
    $("dashboard").innerHTML = "<section class='panel'><h2>Access denied</h2><p>This account is not listed as the ELORA admin.</p></section>";
    return;
  }
  await loadSettings();
  await loadProducts();
  await loadOrders();
  await loadReviews();
}

$("loginBtn").onclick = async () => {
  msg("loginMsg", "Signing in…");
  const { data, error } = await db.auth.signInWithPassword({ email: $("email").value.trim(), password: $("password").value });
  if (error) return msg("loginMsg", error.message);
  await showDashboard(data.session);
};
$("logoutBtn").onclick = async () => { await db.auth.signOut(); location.reload(); };

async function loadOrders() {
  const status = $("orderFilter").value;
  msg("ordersMsg", "Loading orders…");
  let query = db.from("orders").select("*").order("created_at", { ascending: false });
  if (status !== "All") query = query.eq("status", status);
  const { data, error } = await query;
  if (error) { msg("ordersMsg", error.message); $("orderList").innerHTML = ""; return; }
  msg("ordersMsg", data?.length ? `${data.length} order(s)` : "No orders yet.");
  const box = $("orderList");
  if (!data?.length) { box.innerHTML = "<p class='muted'>When a customer places an order, it will appear here.</p>"; return; }

  box.innerHTML = data.map(orderCardHtml).join("");
  box.querySelectorAll(".status-select").forEach(select => {
    select.addEventListener("change", async () => {
      const { error } = await db.from("orders").update({ status: select.value }).eq("id", select.dataset.id);
      if (error) { alert(error.message); await loadOrders(); }
      else msg("ordersMsg", "Order status saved online ✓");
    });
  });

  for (const order of data) await loadOrderItems(order.id);
}

function orderCardHtml(o) {
  const options = ["New", "Confirmed", "Shipped", "Delivered", "Cancelled"];
  const statusOptions = options.map(s => `<option${s === o.status ? " selected" : ""}>${s}</option>`).join("");
  const notes = o.notes ? `<div class="full"><b>Notes</b><br>${esc(o.notes)}</div>` : "";
  const orderNo = o.order_number ? esc(o.order_number) : esc(String(o.id||"").slice(0, 8).toUpperCase());
  const itemsPreview = Array.isArray(o.items) && o.items.length ? `<div class="full"><b>Items (from order)</b><br>${esc(JSON.stringify(o.items))}</div>` : "";
  return `<article class="order-card">
    <div class="order-head">
      <div><strong>Order ${orderNo}</strong><div class="muted">${o.created_at?new Date(o.created_at).toLocaleString():""}</div></div>
      <select class="status-select" data-id="${esc(o.id)}">${statusOptions}</select>
    </div>
    <div class="order-details">
      <div><b>Customer</b><br>${esc(o.customer_name)}</div>
      <div><b>Phone</b><br>${esc(o.phone)}</div>
      <div><b>City</b><br>${esc(o.city || "—")}</div>
      <div><b>Total</b><br><span class="gold">${money(o.total)}</span></div><div><b>Payment</b><br>Cash on Delivery</div>
      <div class="full"><b>Address</b><br>${esc(o.address)}</div>${notes}
    </div>
    <div class="items" id="items-${esc(o.id)}"><span class="muted">Loading items…</span></div>
  </article>`;
}

async function loadOrderItems(orderId) {
  const el = document.getElementById(`items-${orderId}`);
  if (!el) return;
  // New RPC stores items inside orders.items JSON; old setup uses order_items table. Support both.
  try{
    const {data:ord}=await db.from("orders").select("items").eq("id",orderId).maybeSingle();
    if(ord && Array.isArray(ord.items) && ord.items.length){
      const prodMap={};
      try{ const {data:prods}=await db.from("products").select("id,name,price"); (prods||[]).forEach(p=>prodMap[String(p.id)]=p); }catch(_){}
      const rows=ord.items.map(it=>{const pid=String(it.product_id??it.id??"");const q=Number(it.quantity||1);const p=prodMap[pid];const nm=p?p.name:(it.product_name||("Product "+pid));const pr=p?p.price:Number(it.unit_price||it.price||0);return `<div class="item-line"><span>${esc(nm)} × ${q}</span><span>${money(pr*q)}</span></div>`;}).join("");
      el.innerHTML=`<b>Items</b>${rows}`; return;
    }
  }catch(_){}
  const { data, error } = await db.from("order_items").select("product_name,unit_price,quantity,line_total").eq("order_id", orderId);
  if (!el) return;
  if (error) { el.textContent = error.message; return; }
  if (!data?.length) { el.innerHTML = "<span class='muted'>No item details.</span>"; return; }
  const rows = data.map(i => `<div class="item-line"><span>${esc(i.product_name)} × ${i.quantity}</span><span>${money(i.line_total)}</span></div>`).join("");
  el.innerHTML = `<b>Items</b>${rows}`;
}

$("refreshOrders").onclick = loadOrders;
$("orderFilter").onchange = loadOrders;

async function loadReviews(){
  const filter=$("reviewFilter").value;msg("reviewsMsg","Loading reviews…");
  // Dual-schema: live DB uses customer_name+status, repo SQL uses reviewer_name+approved
  let data=null,error=null,schema="new";
  let q=db.from("product_reviews").select("*,products(name)").order("created_at",{ascending:false});
  if(filter==="pending")q=q.eq("status","pending");else if(filter==="approved")q=q.eq("status","approved");
  let r=await q;
  if(r.error && /approved|status/i.test(r.error.message||"")){
    schema="old";
    let q2=db.from("product_reviews").select("*,products(name)").order("created_at",{ascending:false});
    if(filter==="pending")q2=q2.eq("approved",false);else if(filter==="approved")q2=q2.eq("approved",true);
    r=await q2;
  }
  if(r.error && /customer_name|reviewer_name|product_reviews/i.test(r.error.message||"")){
    // Last resort: plain select without join
    let q3=db.from("product_reviews").select("*").order("created_at",{ascending:false});
    r=await q3; schema="new";
  }
  data=r.data;error=r.error;
  if(error){msg("reviewsMsg",error.message+" — SUPABASE_FIX.sql run karen.");$("reviewList").innerHTML="";return}
  let rows=data||[];
  if(schema==="new"&&filter!=="all")rows=rows.filter(x=>filter==="pending"?(x.status||"").toLowerCase()!=="approved":(x.status||"").toLowerCase()==="approved");
  msg("reviewsMsg",rows.length?`${rows.length} review(s)`:"No reviews yet.");const box=$("reviewList");
  if(!rows.length){box.innerHTML="<p class='muted'>No reviews match this filter.</p>";return}
  const norm=(x)=>({id:x.id,pname:x.product_name||x.products?.name||"Product",rating:Number(x.rating)||0,text:x.review_text||"No written review.",by:x.customer_name||x.reviewer_name||"Customer",time:x.created_at?new Date(x.created_at).toLocaleString():"",approved:(x.status?(String(x.status).toLowerCase()==="approved"):!!x.approved)});
  box.innerHTML=rows.map(x=>{const r2=norm(x);return `<article class="review-admin-card"><div class="review-admin-head"><div><strong>${esc(r2.pname)}</strong><div class="muted">${esc(r2.time)}</div></div><span class="stars">${"★".repeat(r2.rating)}${"☆".repeat(5-r2.rating)}</span></div><p>${esc(r2.text)}</p><div class="muted">By ${esc(r2.by)}</div><div class="review-admin-actions">${r2.approved?`<button class="secondary review-toggle" data-id="${esc(x.id)}" data-act="hide">HIDE</button>`:`<button class="review-toggle" data-id="${esc(x.id)}" data-act="approve">APPROVE</button>`}<button class="secondary review-delete" data-id="${esc(x.id)}">DELETE</button></div></article>`;}).join("");
  box.querySelectorAll(".review-toggle").forEach(b=>b.addEventListener("click",async()=>{let err=null;if(schema==="new"){const {error}=await db.from("product_reviews").update({status:b.dataset.act==="approve"?"approved":"pending"}).eq("id",b.dataset.id);err=error;}else{const {error}=await db.from("product_reviews").update({approved:b.dataset.act==="approve"}).eq("id",b.dataset.id);err=error;}if(err)alert(err.message);await loadReviews()}));
  box.querySelectorAll(".review-delete").forEach(b=>b.addEventListener("click",async()=>{if(!confirm("Delete this review?"))return;const {error}=await db.from("product_reviews").delete().eq("id",b.dataset.id);if(error)alert(error.message);await loadReviews()}));
}
$("refreshReviews").onclick=loadReviews;$("reviewFilter").onchange=loadReviews;

async function loadSettings() {
  const { data } = await db.from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (!data) return;
  $("brandName").value = data.brand_name || "";
  $("phone").value = data.phone || "";
  $("whatsapp").value = data.whatsapp || "";
  $("facebook").value = data.facebook || "";
  $("instagram").value = data.instagram || "";
  $("tiktok").value = data.tiktok || "";
  $("heroTitle").value = data.hero_title || "";
  $("heroSubtitle").value = data.hero_subtitle || "";
  $("aboutText").value = data.about_text || "";
}

$("saveSettings").onclick = async () => {
  const row = {
    id: 1, brand_name: $("brandName").value.trim(), phone: $("phone").value.trim(), whatsapp: $("whatsapp").value.trim(),
    facebook: $("facebook").value.trim(), instagram: $("instagram").value.trim(), tiktok: $("tiktok").value.trim(),
    hero_title: $("heroTitle").value.trim(), hero_subtitle: $("heroSubtitle").value.trim(), about_text: $("aboutText").value.trim()
  };
  const { error } = await db.from("site_settings").upsert(row);
  msg("settingsMsg", error ? error.message : "Saved online ✓");
};

async function loadProducts() {
  const { data, error } = await db.from("products").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  const box = $("productList");
  if (error) { box.textContent = error.message; return; }
  if (!data?.length) { box.innerHTML = "<p class='muted'>No products yet.</p>"; return; }
  box.innerHTML = data.map(productHtml).join("");
}

function productHtml(p) {
  const old = p.old_price ? `Rs. ${esc(p.old_price)} → ` : "";
  return `<div class="product-row"><img src="${esc(p.image_url || "")}"><div class="product-info"><strong>${esc(p.name)}</strong><div class="muted">${old}Rs. ${esc(p.price)} ${p.tag ? "· " + esc(p.tag) : ""}</div></div><button onclick="editProduct('${p.id}')">Edit</button><button class="secondary" onclick="deleteProduct('${p.id}')">Delete</button></div>`;
}

async function editProduct(id) {
  const { data, error } = await db.from("products").select("*").eq("id", id).single();
  if (error) return msg("productMsg", error.message);
  editingId = id;
  $("productFormTitle").textContent = "Edit Product";
  $("productId").value = id;
  $("productName").value = data.name;
  $("oldPrice").value = data.old_price || "";
  $("price").value = data.price;
  $("tag").value = data.tag || "";
  $("productImage").value = "";
  $("cancelEdit").hidden = false;
  window.scrollTo({ top: document.querySelector("#productFormTitle").offsetTop - 30, behavior: "smooth" });
}
window.editProduct = editProduct;

window.deleteProduct = async id => {
  if (!confirm("Delete this product?")) return;
  const { data } = await db.from("products").select("image_path").eq("id", id).single();
  const { error } = await db.from("products").delete().eq("id", id);
  if (error) return alert(error.message);
  if (data?.image_path) await db.storage.from("product-images").remove([data.image_path]);
  await loadProducts();
};

$("cancelEdit").onclick = () => {
  editingId = null; $("productFormTitle").textContent = "Add Product"; $("productId").value = "";
  $("productName").value = ""; $("oldPrice").value = ""; $("price").value = ""; $("tag").value = "";
  $("productImage").value = ""; $("cancelEdit").hidden = true; msg("productMsg", "");
};

$("saveProduct").onclick = async () => {
  const name = $("productName").value.trim(), price = Number($("price").value);
  if (!name || !price) return msg("productMsg", "Product name and sale price are required.");
  msg("productMsg", "Saving…");
  let image_url = null, image_path = null;
  const file = $("productImage").files[0];
  if (file) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${crypto.randomUUID()}.${ext}`;
    const up = await db.storage.from("product-images").upload(path, file, { upsert: false, contentType: file.type });
    if (up.error) return msg("productMsg", up.error.message);
    image_path = path;
    image_url = db.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  }
  const payload = { name, old_price: $("oldPrice").value ? Number($("oldPrice").value) : null, price, tag: $("tag").value.trim() || null };
  if (editingId) {
    if (image_url) { payload.image_url = image_url; payload.image_path = image_path; }
    const { error } = await db.from("products").update(payload).eq("id", editingId);
    if (error) return msg("productMsg", error.message);
  } else {
    payload.image_url = image_url; payload.image_path = image_path;
    const { error } = await db.from("products").insert(payload);
    if (error) return msg("productMsg", error.message);
  }
  msg("productMsg", "Product saved online ✓");
  $("cancelEdit").click();
  await loadProducts();
};

$("changePassword").onclick = async () => {
  const p = $("newPassword").value;
  if (p.length < 8) return msg("passwordMsg", "Use at least 8 characters.");
  const { error } = await db.auth.updateUser({ password: p });
  msg("passwordMsg", error ? error.message : "Password changed ✓");
  if (!error) $("newPassword").value = "";
};

checkSession();
