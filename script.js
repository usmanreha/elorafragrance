/* ELORA FRAGRANCE storefront - FIXED (reviews dual-schema + order success visible) */
const db = window.eloraSupabase;
const fallbackSettings = {brand_name:"ELORA PERFUME",phone:"",whatsapp:"",facebook:"",instagram:"",tiktok:"",hero_title:"Ameer-ul-Oud",hero_subtitle:"A rare blend of tradition and luxury.",about_text:"Discover elegant fragrances designed to leave a lasting impression."};
const slotNames=["Ameer-ul-Oud","Sabaya","Zarar","Cool-Elexer","Aromatic","Oriental"];
let cart=JSON.parse(localStorage.getItem("elora_cart")||"[]");
let allProducts=[];
let allReviews=[];
let reviewSchema="new"; // "new" = customer_name+status, "old" = reviewer_name+approved

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function money(n){return `Rs. ${Number(n||0).toLocaleString("en-PK")}`}
function saveCart(){localStorage.setItem("elora_cart",JSON.stringify(cart));renderCart()}
function renderSlots(){document.getElementById("slots").innerHTML=slotNames.map((name,i)=>`<a class="slot" href="#shop" data-slot="${esc(name)}"><span class="slot-num">0${i+1}</span><h3>${esc(name)}</h3><p>${i===0?"Signature oud":"Available in shop"}</p></a>`).join("")}

function normReview(r){
  return {
    id: r.id,
    product_id: r.product_id,
    reviewer_name: r.customer_name ?? r.reviewer_name ?? "Customer",
    rating: Number(r.rating)||0,
    review_text: r.review_text ?? r.comment ?? "",
    created_at: r.created_at,
    product_name: r.product_name ?? null
  };
}

async function loadApprovedReviews(){
  // Try NEW schema first (actual live DB): customer_name + status
  let r = await db.from("product_reviews").select("id,product_id,product_name,customer_name,rating,review_text,created_at,status").eq("status","approved").order("created_at",{ascending:false});
  if(!r.error){ reviewSchema="new"; return (r.data||[]).map(normReview); }
  // If status column missing, try without filter then filter client-side
  if(r.error && /status/i.test(r.error.message||"")){
    const r2 = await db.from("product_reviews").select("id,product_id,product_name,customer_name,rating,review_text,created_at,status").order("created_at",{ascending:false});
    if(!r2.error){ reviewSchema="new"; return (r2.data||[]).filter(x=>(x.status||"").toLowerCase()==="approved").map(normReview); }
  }
  // Fallback OLD schema (repo SQL): reviewer_name + approved
  const r3 = await db.from("product_reviews").select("id,product_id,reviewer_name,rating,review_text,created_at").eq("approved",true).order("created_at",{ascending:false});
  if(!r3.error){ reviewSchema="old"; return (r3.data||[]).map(normReview); }
  console.warn("ELORA reviews query failed", r.error, r3.error);
  return {error: (r3.error||r.error)};
}

async function loadStore(){
  renderSlots();
  const {data:s,error:se}=await db.from("site_settings").select("*").eq("id",1).maybeSingle();
  const settings=se||!s?fallbackSettings:s;
  document.title=(settings.brand_name||"ELORA")+" | Perfumes";
  document.getElementById("aboutText").textContent=settings.about_text||fallbackSettings.about_text;
  document.getElementById("footerBrand").textContent=settings.brand_name||fallbackSettings.brand_name;
  const ph=document.getElementById("phoneLink"),wa=document.getElementById("waLink");
  ph.innerHTML=settings.phone?'<span class="brand-icon phone-icon">☎</span><span class="brand-text">'+esc(settings.phone)+'</span>':'<span class="brand-icon phone-icon">☎</span><span class="brand-text"></span>';
  ph.href=settings.phone?"tel:"+settings.phone.replace(/[^\d+]/g,""):"#";
  wa.innerHTML=settings.whatsapp?'<span class="brand-icon wa-icon">WA</span><span class="brand-text">WhatsApp</span>':'<span class="brand-icon wa-icon">WA</span><span class="brand-text"></span>';
  wa.href=settings.whatsapp?"https://wa.me/"+settings.whatsapp.replace(/\D/g,""):"#";
  for(const [id,key,label,icon,cls] of [["fbLink","facebook","Facebook","f","fb-icon"],["igLink","instagram","Instagram","◎","ig-icon"],["ttLink","tiktok","TikTok","♪","tt-icon"]]){const a=document.getElementById(id);a.innerHTML=settings[key]?'<span class="brand-icon '+cls+'">'+icon+'</span><span class="brand-text">'+label+'</span>':'<span class="brand-icon '+cls+'">'+icon+'</span><span class="brand-text"></span>';a.href=settings[key]||"#";a.style.display=settings[key]?"inline-flex":"none"}
  const box=document.getElementById("products");
  let {data:products,error}=await db.from("products").select("*").order("sort_order",{ascending:true});
  if(error){
    console.warn("ELORA products sorted query failed; retrying basic query",error);
    const retry=await db.from("products").select("*");
    products=retry.data; error=retry.error;
  }
  if(error){box.innerHTML=`<p>Products could not be loaded: ${esc(error.message||"Supabase setup error")}</p>`;return}
  allProducts=products||[];
  const revResult=await loadApprovedReviews();
  if(revResult && revResult.error){
    document.getElementById("reviewMsg").textContent="";
    allReviews=[];
    const rb=document.getElementById("reviewSummary");
    rb.innerHTML=`<div class="review-empty-panel">Ratings are temporarily unavailable (${esc(revResult.error.message||"setup error")}). Please run SUPABASE_FIX.sql once in Supabase SQL Editor.</div>`;
  } else {
    allReviews=revResult||[];
  }
  renderProducts(allProducts);renderReviewSummary();renderCart();
}
function stars(n){const r=Math.max(0,Math.min(5,Math.round(Number(n)||0)));return "★".repeat(r)+"☆".repeat(5-r)}
function reviewSummary(productId){const rows=allReviews.filter(r=>String(r.product_id)===String(productId));if(!rows.length)return '<div class="rating-empty">No ratings yet</div>';const avg=rows.reduce((a,r)=>a+Number(r.rating),0)/rows.length;return `<div class="rating-summary"><span class="stars">${stars(avg)}</span><strong>${avg.toFixed(1)}</strong><span class="review-count">(${rows.length} review${rows.length===1?'':'s'})</span></div>`}
function reviewForm(p){return `<div class="review-box" id="review-${esc(p.id)}" hidden><div class="review-box-head"><b>Review ${esc(p.name)}</b><button type="button" class="review-close" data-review-close="${esc(p.id)}">×</button></div><form class="review-form" data-product-id="${esc(p.id)}" data-product-name="${esc(p.name)}"><label>Your name<input name="customer_name" required maxlength="80" placeholder="Your name" autocomplete="name"></label><label>Rating<select name="rating" required><option value="5">★★★★★ — 5</option><option value="4">★★★★☆ — 4</option><option value="3">★★★☆☆ — 3</option><option value="2">★★☆☆☆ — 2</option><option value="1">★☆☆☆☆ — 1</option></select></label><label class="full">Your review<textarea name="review_text" maxlength="500" rows="3" placeholder="Share your experience (optional)"></textarea></label><button class="gold-btn" type="submit">SUBMIT REVIEW</button><p class="review-form-msg" aria-live="polite"></p></form></div>`}
function renderProducts(products){
  const box=document.getElementById("products");
  document.getElementById("shopMsg").textContent=products.length?`${products.length} fragrance${products.length===1?"":"s"} available`:"";
  if(!products.length){box.innerHTML='<div class="empty-shop"><p>No perfumes have been added yet.</p><p>Open the Admin page to add Ameer-ul-Oud, Sabaya, Zarar, Cool-Elexer, Aromatic or Oriental.</p></div>';return}
  box.innerHTML=products.map(p=>`<article class="card">${p.tag?`<span class="tag">${esc(p.tag)}</span>`:""}${p.image_url?`<img src="${esc(p.image_url)}" alt="${esc(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='hero_ameer.png';">`:`<img class="product-fallback" src="hero_ameer.png" alt="${esc(p.name)}" loading="lazy">`}<h3>${esc(p.name)}</h3>${reviewSummary(p.id)}<div class="price">${p.old_price?`<span class="old">Rs. ${esc(p.old_price)}</span>`:""}${money(p.price).replace("Rs. ","Rs. ")}</div><div class="card-actions"><button class="add-cart" type="button" data-id="${esc(p.id)}" data-name="${esc(p.name)}" data-price="${Number(p.price)}">ADD TO CART</button><button class="review-btn" type="button" data-review-open="${esc(p.id)}">WRITE A REVIEW</button></div>${reviewForm(p)}</article>`).join("");
  box.querySelectorAll(".add-cart").forEach(b=>b.addEventListener("click",()=>{addToCart({id:b.dataset.id,name:b.dataset.name,price:Number(b.dataset.price)})}));
  box.querySelectorAll("[data-review-open]").forEach(b=>b.addEventListener("click",()=>{const el=document.getElementById(`review-${b.dataset.reviewOpen}`);if(el){el.hidden=false;el.scrollIntoView({behavior:"smooth",block:"nearest"});}}));
  box.querySelectorAll("[data-review-close]").forEach(b=>b.addEventListener("click",()=>{const el=document.getElementById(`review-${b.dataset.reviewClose}`);if(el)el.hidden=true}));
  box.querySelectorAll(".review-form").forEach(form=>form.addEventListener("submit",submitReview));
}
async function submitReview(e){
  e.preventDefault();
  const form=e.currentTarget,msgEl=form.querySelector(".review-form-msg"),fd=new FormData(form);
  msgEl.textContent="Submitting review…";
  const payloadNew={product_id:isNaN(Number(form.dataset.productId))?form.dataset.productId:Number(form.dataset.productId),customer_name:String(fd.get("customer_name")||fd.get("reviewer_name")||"").trim(),rating:Number(fd.get("rating")),review_text:String(fd.get("review_text")||"").trim()||null,product_name:form.dataset.productName||null,status:"pending"};
  if(!payloadNew.customer_name){msgEl.textContent="Please enter your name.";return}
  // Try NEW schema first
  let res=await db.from("product_reviews").insert(payloadNew);
  if(!res.error){msgEl.textContent="Thanks! Your review was submitted and will appear after approval.";form.reset();return}
  // If product_name column missing, retry without it
  if(/product_name/i.test(res.error.message||"")){
    const {product_name,...rest}=payloadNew;
    res=await db.from("product_reviews").insert(rest);
    if(!res.error){msgEl.textContent="Thanks! Your review was submitted and will appear after approval.";form.reset();return}
  }
  // If status column missing, try OLD schema
  if(/status|reviewer_name|approved|customer_name/i.test(res.error.message||"")||res.error.code==="42703"){
    const oldPayload={product_id:payloadNew.product_id,reviewer_name:payloadNew.customer_name,rating:payloadNew.rating,review_text:payloadNew.review_text};
    const r2=await db.from("product_reviews").insert(oldPayload);
    if(!r2.error){msgEl.textContent="Thanks! Your review was submitted and will appear after approval.";form.reset();return}
    res=r2;
  }
  console.error("ELORA review insert failed",res.error);
  if(res.error && (res.error.code==="42501"||/row-level security/i.test(res.error.message||""))){
    msgEl.textContent="Review system is locked by database permissions. Please run SUPABASE_FIX.sql once in Supabase SQL Editor, then try again.";
  } else {
    msgEl.textContent=res.error?res.error.message:"Could not submit review.";
  }
}
function renderReviewSummary(){
  const box=document.getElementById("reviewSummary");if(!box)return;
  if(!allReviews.length){box.innerHTML='<div class="review-empty-panel">No approved reviews yet. Be the first to share your experience.</div>';return}
  const productById=Object.fromEntries(allProducts.map(p=>[String(p.id),p]));
  box.innerHTML=allReviews.slice(0,6).map(r=>`<article class="review-card"><div class="review-card-top"><span class="stars">${stars(r.rating)}</span><span>${r.created_at?new Date(r.created_at).toLocaleDateString():""}</span></div><h3>${esc(productById[String(r.product_id)]?.name||r.product_name||"ELORA Fragrance")}</h3><p>${esc(r.review_text||"Great fragrance!")}</p><strong>${esc(r.reviewer_name)}</strong></article>`).join("");
}
function addToCart(item){const x=cart.find(i=>String(i.id)===String(item.id));if(x)x.quantity=Math.min(99,x.quantity+1);else cart.push({...item,quantity:1});saveCart();openCart()}
function changeQty(id,delta){const x=cart.find(i=>String(i.id)===String(id));if(!x)return;x.quantity=Math.max(0,Math.min(99,x.quantity+delta));cart=cart.filter(i=>i.quantity>0);saveCart()}
function removeItem(id){cart=cart.filter(i=>String(i.id)!==String(id));saveCart()}
function renderCart(){
  document.getElementById("cartCount").textContent=cart.reduce((s,x)=>s+x.quantity,0);
  const box=document.getElementById("cartItems");
  if(!cart.length)box.innerHTML='<p class="empty-cart">Your cart is empty. Add a perfume from the shop.</p>';
  else box.innerHTML=cart.map(x=>`<div class="cart-row"><div><strong>${esc(x.name)}</strong><div>${money(x.price)} each</div></div><div class="qty"><button type="button" data-action="minus" data-id="${esc(x.id)}">−</button><span>${x.quantity}</span><button type="button" data-action="plus" data-id="${esc(x.id)}">+</button></div><strong>${money(x.price*x.quantity)}</strong><button class="remove-item" type="button" data-action="remove" data-id="${esc(x.id)}">Remove</button></div>`).join("");
  const total=cart.reduce((s,x)=>s+x.price*x.quantity,0);document.getElementById("cartTotal").textContent=money(total);
  const form=document.getElementById("checkoutForm");
  const success=document.getElementById("orderSuccess");
  const hasSuccess=success && !success.hidden;
  // FIX: success message ko mat chhupao. Cart khaali hone par form chhupao, lekin success dikhao.
  form.style.display=cart.length?"block":"none";
  if(!cart.length && !hasSuccess){ document.getElementById("orderMsg").textContent=""; }
  box.querySelectorAll("button[data-action]").forEach(b=>b.addEventListener("click",()=>{const a=b.dataset.action;a==="remove"?removeItem(b.dataset.id):changeQty(b.dataset.id,a==="plus"?1:-1)}));
}
function openCart(){
  const panel=document.getElementById("cartPanel");
  const overlay=document.getElementById("cartOverlay");
  if(!panel)return;
  panel.hidden=false;
  panel.classList.add("cart-open");
  panel.setAttribute("aria-hidden","false");
  if(overlay){overlay.hidden=false;}
  document.body.classList.add("cart-lock");
  const btn=document.getElementById("cartBtn");
  if(btn)btn.setAttribute("aria-expanded","true");
}
function closeCart(){
  const panel=document.getElementById("cartPanel");
  const overlay=document.getElementById("cartOverlay");
  if(!panel)return;
  panel.classList.remove("cart-open");
  panel.setAttribute("aria-hidden","true");
  panel.hidden=true;
  if(overlay)overlay.hidden=true;
  document.body.classList.remove("cart-lock");
  const btn=document.getElementById("cartBtn");
  if(btn)btn.setAttribute("aria-expanded","false");
}
function toggleCart(e){if(e)e.preventDefault();const panel=document.getElementById("cartPanel");if(panel && panel.classList.contains("cart-open"))closeCart();else openCart();}
function bindCartControls(){
  const cartBtnEl=document.getElementById("cartBtn");
  const closeCartEl=document.getElementById("closeCart");
  const overlayEl=document.getElementById("cartOverlay");
  if(cartBtnEl){cartBtnEl.setAttribute("aria-expanded","false");cartBtnEl.addEventListener("click",toggleCart);}
  if(closeCartEl)closeCartEl.addEventListener("click",closeCart);
  if(overlayEl)overlayEl.addEventListener("click",closeCart);
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeCart();});
}
bindCartControls();
const searchEl=document.getElementById("searchInput");
if(searchEl) searchEl.addEventListener("input",e=>{const q=e.target.value.trim().toLowerCase();renderProducts(allProducts.filter(p=>String(p.name||"").toLowerCase().includes(q)||String(p.tag||"").toLowerCase().includes(q)))});
document.getElementById("checkoutForm").addEventListener("submit",async e=>{
  e.preventDefault();
  if(!cart.length)return;
  const form=e.currentTarget;
  const msg=document.getElementById("orderMsg");
  const success=document.getElementById("orderSuccess");
  const submit=form.querySelector(".submit-btn");
  success.hidden=true; success.innerHTML="";
  msg.textContent="Placing COD order…";
  if(submit){submit.disabled=true;submit.textContent="PLACING ORDER…";}
  try{
    const payload={
      p_customer_name:document.getElementById("customerName").value.trim(),
      p_phone:document.getElementById("customerPhone").value.trim(),
      p_address:document.getElementById("customerAddress").value.trim(),
      p_city:document.getElementById("customerCity").value.trim(),
      p_notes:document.getElementById("customerNotes").value.trim(),
      p_items:cart.map(x=>({product_id:isNaN(Number(x.id))?x.id:Number(x.id),quantity:Number(x.quantity)})),
      p_payment_method:"Cash on Delivery"
    };
    if(!payload.p_customer_name||!payload.p_phone||!payload.p_address){msg.textContent="Please fill Name, Phone and Address.";return}
    const rpcResult=await Promise.race([
      db.rpc("create_order",payload),
      new Promise(resolve=>setTimeout(()=>resolve({data:null,error:{message:"Order request timed out. Please check internet and try again."}}),20000))
    ]);
    let {data:orderData,error}=rpcResult;
    if(error){
      console.error("ELORA create_order RPC failed",{error,payload});
      msg.textContent=`Order failed: ${error.message||"Unknown Supabase error"}${error.code?` (code ${error.code})`:""}`;
      return;
    }
    // RPC returns: object {id, order_number,...} OR uuid string OR array
    let orderId="",orderNo="";
    if(orderData && typeof orderData==="object" && !Array.isArray(orderData)){ orderId=orderData.id||""; orderNo=orderData.order_number||""; }
    else if(Array.isArray(orderData)){ const f=orderData[0]; if(f&&typeof f==="object"){orderId=f.id||"";orderNo=f.order_number||"";} else {orderId=String(f||"");} }
    else { orderId=String(orderData||""); }
    const showId=orderNo||(orderId?String(orderId).slice(0,8).toUpperCase():"");
    const okText=`✓ COD order placed successfully${showId?". Order No: "+esc(showId):"." } We will call you soon for confirmation.`;
    msg.textContent=okText;
    success.innerHTML=`<div class="success-tick">✓</div><div><b>Order confirmed! Shukriya!</b><br>${esc(okText)}<br><small>Cart ab khaali ho gaya hai kyun ke order save ho gaya hai. Apna order Admin panel me Orders me dekhen.</small></div>`;
    success.hidden=false;
    cart=[];
    saveCart();
    form.reset();
    success.scrollIntoView({behavior:"smooth",block:"center"});
  }catch(err){
    console.error("ELORA checkout exception",err);
    msg.textContent=err?.message||"Could not place the order. Please try again.";
  }finally{
    if(submit){submit.disabled=false;submit.textContent="PLACE COD ORDER";}
  }
});
loadStore();
