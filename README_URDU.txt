ELORA FRAGRANCE - FIXED PACK (Roman Urdu Guide)
================================================

Assalam-o-Alaikum! Aap ki sari problems fix kar di hain. Neeche step-by-step hai.

1) ADMIN SITE (link)
-------------------
Store: https://usmanreha.github.io/elorafragrance/
Admin: https://usmanreha.github.io/elorafragrance/admin.html
Admin login Supabase Auth email+password se hota hai. Wahan Orders, Reviews, Products, Settings sab online save hota hai.

2) IS PACK ME KYA FIX HUA
--------------------------
a) Order Confirm wala masla:
   - Pehle order success ke baad cart 0 ho jata tha AUR success message bhi ghayab ho jata tha (kyun ke form hide ho jata tha). Ab green "Order confirmed! Order No: ELORA-..." banner cart ke upar rehta hai, chahe cart 0 ho jaye.
   - Order number (ELORA-...) ab sahi show hota hai. Pehle "[object Object]" jaisa ghalat ID aata tha.
   - Test me order RPC chal raha hai (maine 3 test orders banaye thay diagnosis ke liye - neeche note dekhen).

b) Rating/Review wala error:
   - Error tha: "Could not find reviewer_name column in schema cache"
   - Wajah: live database me column hai customer_name + status, lekin website code maang raha tha reviewer_name + approved. Dono ka naam alag tha.
   - Fix: script.js + admin.js ab DONO schema support karte hain. Aur SUPABASE_FIX.sql dono columns ko sync kar dega + RLS permission khol dega.
   - ZAROORI: SUPABASE_FIX.sql ek dafa Supabase > SQL Editor > New Query me paste karke RUN karen. Us ke baad 1-2 min wait karen, phir site refresh karen. Review error khatam ho jayega.

c) Neeche 2 lines / pura view nahi aata / rating option cut-ta hai:
   - Reviews heading overlap fix, review form ab mobile par 1 column me aata hai, bahar nahi nikalta.
   - Chhoti screen (560px se kam) par products ab 1 column me aate hain taake pura view aaye. Pehle 2 patli columns ki wajah se text cut raha tha.
   - Horizontal scroll lock kiya.

d) Logo Google/bahar wali site par nahi aata tha:
   - Pehle og:image relative tha (logo-circle.png). Google ko absolute URL chahiye. Ab https://usmanreha.github.io/elorafragrance/logo-circle.png + favicon + JSON-LD lagaya hai.
   - Note: Google ko logo dikhane me 3-7 din lag sakte hain (indexing time). Search Console me URL Inspection > Request Indexing karen.

e) Hashtags/Reach (#):
   - Footer me hashtags add kiye: #EloraFragrance #EloraPerfume #AmeerUlOud #PakistaniPerfumes etc + meta keywords/description + Open Graph. Yeh reach me help karega.

f) Bina pooche nazar aane wale masle:
   - Product ID integer (2) vs UUID mismatch handle kiya.
   - Admin Orders me order_number + items JSON dono dikhenge (purani + nayi dono RPC support).
   - Search, cart drawer, Escape close sab rakha.

3) YE FILES KAISE LIVE KAREN (GitHub Pages)
-------------------------------------------
Option A - GitHub web se (asan):
1. https://github.com/usmanreha/elorafragrance kholen
2. index.html, script.js, style.css, admin.js khol kar Edit (pencil) > is pack wali file ka content paste > Commit
3. 2-3 min baad https://usmanreha.github.io/elorafragrance/ refresh karen (Ctrl+Shift+R)

Option B - ZIP upload:
- Is folder ki sari files ko GitHub me upload/replace karen.

SUPABASE_FIX.sql Supabase me RUN karna na bhoolen, warna reviews phir fail honge.

4) GOOGLE PAR PUBLISH
---------------------
Site ALREADY Google par live hai (GitHub Pages URL Google index kar sakta hai).
Aap ne google-site-verification tag lagaya hua hai, woh rakha hai.
Steps:
1. https://search.google.com/search-console > apni property kholen
2. URL Inspection me https://usmanreha.github.io/elorafragrance/ dalkar Request Indexing karen
3. Sitemap: https://usmanreha.github.io/elorafragrance/sitemap.xml (is pack me nahi, chaaho to batao bana dunga)
Main aap ka Search Console account access nahi kar sakta, is liye ye 2 click aap ko karne honge.

5) DOMAIN ELORAFRAGRANCE.com
-----------------------------
Main aap ke liye domain BUY nahi kar sakta (paise + ownership aap ke naam par hota hai).
Aap ko khud karna hoga, phir main connect karne me help kar dunga:
1. Porkbun/Namecheap/GoDaddy se elorafragrance.com buy karen (~$10-15/saal). Spelling note: aap ne ELORA FRAGNANCE / FRAGNENCE likha tha - sahi spelling FRAGRANCE hai, wahi buy karen.
2. GitHub repo > Settings > Pages > Custom domain me domain likhen.
3. Domain DNS me 4 A records (185.199.108.153, .109, .110, .111) + www CNAME (usmanreha.github.io) lagayen.
4. Bata den, main CNAME file + links fix karke de dunga.
Tab URL https://elorafragrance.com ho jayega. Jab tak domain nahi hai, GitHub wala URL hi chalega - us ka naam change nahi ho sakta.

6) TEST ORDERS NOTE
-------------------
Diagnosis ke liye maine aap ke live Supabase par 3 TEST orders banaye thay (Test User / test). Woh Admin > Orders me nazar aayenge. Kindly unhe Admin se Cancelled/Delete kar den ya rehne den. Customer ko nazar nahi aate.

7) FILES IS PACK ME
--------------------
index.html, script.js, style.css, admin.html, admin.js, admin.css, supabase-config.js, favicon.png, logo-circle.png, hero_ameer.png, SUPABASE_FIX.sql

Koi aur masla aaye to screenshot ke sath bhej den, bina pooche fix kar dunga.
