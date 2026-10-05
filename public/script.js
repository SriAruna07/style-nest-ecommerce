const state = {
  products: [],
  filter: "All",
  sort: "default",
  cart: JSON.parse(localStorage.getItem("styleNestCart") || "[]"),
  wishlist: JSON.parse(localStorage.getItem("styleNestWishlist") || "[]"),
  token: localStorage.getItem("styleNestToken") || "",
  user: JSON.parse(localStorage.getItem("styleNestUser") || "null")
};

const $ = (id) => document.getElementById(id);
const money = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

function saveState() {
  localStorage.setItem("styleNestCart", JSON.stringify(state.cart));
  localStorage.setItem("styleNestWishlist", JSON.stringify(state.wishlist));
  if (state.token) localStorage.setItem("styleNestToken", state.token);
  if (state.user) localStorage.setItem("styleNestUser", JSON.stringify(state.user));
  else localStorage.removeItem("styleNestUser");
}

function showToast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  setTimeout(() => $("toast").classList.remove("show"), 2200);
}

async function api(url, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Something went wrong.");
  return data;
}

function imageForProduct(product) {
  if (product.image) return product.image;
  const images = {
    "Tops & T-Shirts": "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
    "Jeans & Trousers": "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80",
    "Footwear": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
    "Bags": "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80",
    "Watches": "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=900&q=80",
    "Accessories": "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=80"
  };
  return images[product.category] || images["Accessories"];
}

function safeText(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
}

async function loadProducts() {
  try {
    state.products = await api("/api/products");
  } catch {
    state.products = [];
  }
  renderProducts();
}

function renderProducts() {
  let list = [...state.products];

  if (state.filter !== "All") list = list.filter(p => p.category === state.filter);

  const search = $("searchInput").value.trim().toLowerCase();
  if (search) list = list.filter(p => `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(search));

  if (state.sort === "low") list.sort((a,b) => a.price - b.price);
  if (state.sort === "high") list.sort((a,b) => b.price - a.price);
  if (state.sort === "name") list.sort((a,b) => a.name.localeCompare(b.name));

  $("productGrid").innerHTML = list.map(productCard).join("");
  $("emptyProducts").classList.toggle("hidden", list.length !== 0);
}

function productCard(p) {
  const wished = state.wishlist.includes(String(p._id));
  return `
    <article class="product-card">
      <button class="wish" data-wish="${p._id}">${wished ? "♥" : "♡"}</button>
      <img class="product-image" src="${imageForProduct(p)}" alt="${safeText(p.name)}" data-view="${p._id}">
      <div class="product-info">
        <div class="product-category">${safeText(p.category)}</div>
        <h3 class="product-name">${safeText(p.name)}</h3>
        <p class="product-desc">${safeText(p.description || "A carefully selected StyleNest piece.")}</p>
        <div class="product-bottom">
          <span class="price">${money(p.price)}</span>
          <button class="add-btn" data-add="${p._id}" ${p.stock <= 0 ? "disabled" : ""}>${p.stock > 0 ? "Add to Cart" : "Sold Out"}</button>
        </div>
        <div class="stock-note">${p.stock > 0 ? `${p.stock} available` : "Currently unavailable"}</div>
      </div>
    </article>`;
}

function updateCartCount() {
  $("cartCount").textContent = state.cart.reduce((sum, i) => sum + i.quantity, 0);
}

function addToCart(id, size, color) {
  const product = state.products.find(p => String(p._id) === String(id));
  if (!product) return;

  const key = `${id}|${size || ""}|${color || ""}`;
  const existing = state.cart.find(i => i.key === key);

  if (existing) {
    if (existing.quantity >= product.stock) return showToast("No more stock available.");
    existing.quantity++;
  } else {
    state.cart.push({
      key,
      product: product._id,
      name: product.name,
      price: product.price,
      image: imageForProduct(product),
      quantity: 1,
      size: size || product.sizes?.[0] || "Standard",
      color: color || product.colors?.[0] || "Default"
    });
  }

  saveState();
  updateCartCount();
  showToast("Added to your bag.");
}

function renderCart() {
  const box = $("cartItems");
  if (!state.cart.length) {
    box.innerHTML = `<p class="empty-state">Your bag is waiting for something beautiful.</p>`;
  } else {
    box.innerHTML = state.cart.map(item => `
      <div class="cart-row">
        <img src="${item.image}" alt="">
        <div>
          <h4>${safeText(item.name)}</h4>
          <small>${safeText(item.size)} · ${safeText(item.color)} · ${money(item.price)}</small>
          <div class="qty">
            <button data-qty="${item.key}" data-change="-1">−</button>
            <b>${item.quantity}</b>
            <button data-qty="${item.key}" data-change="1">+</button>
            <button class="remove-cart" data-remove="${item.key}">Remove</button>
          </div>
        </div>
        <b>${money(item.price * item.quantity)}</b>
      </div>
    `).join("");
  }

  const subtotal = state.cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  $("cartSubtotal").textContent = money(subtotal);
  $("cartTotal").textContent = money(subtotal);
  $("checkoutBtn").disabled = state.cart.length === 0;
}

function openModal(id) { $(id).classList.remove("hidden"); }
function closeModal(id) { $(id).classList.add("hidden"); }

function openProduct(id) {
  const p = state.products.find(x => String(x._id) === String(id));
  if (!p) return;

  let selectedSize = p.sizes?.[0] || "Standard";
  let selectedColor = p.colors?.[0] || "Default";

  $("productDetail").innerHTML = `
    <div class="product-detail">
      <img src="${imageForProduct(p)}" alt="${safeText(p.name)}">
      <div>
        <p class="eyebrow">${safeText(p.category)}</p>
        <h2>${safeText(p.name)}</h2>
        <div class="detail-price">${money(p.price)}</div>
        <p class="detail-desc">${safeText(p.description || "A refined StyleNest selection designed for everyday wear.")}</p>

        <label class="choice-label">SIZE</label>
        <div class="choices" id="detailSizes">
          ${(p.sizes?.length ? p.sizes : ["Standard"]).map((s,i) => `<button class="choice ${i===0 ? "selected":""}" data-size="${safeText(s)}">${safeText(s)}</button>`).join("")}
        </div>

        <label class="choice-label">COLOR</label>
        <div class="choices" id="detailColors">
          ${(p.colors?.length ? p.colors : ["Default"]).map((c,i) => `<button class="choice ${i===0 ? "selected":""}" data-color="${safeText(c)}">${safeText(c)}</button>`).join("")}
        </div>

        <p class="stock-note">${p.stock} in stock</p>
        <button class="primary-btn full-btn" id="detailAdd" ${p.stock <= 0 ? "disabled" : ""}>Add to Cart</button>
      </div>
    </div>`;

  document.querySelectorAll("[data-size]").forEach(btn => btn.onclick = () => {
    selectedSize = btn.dataset.size;
    document.querySelectorAll("[data-size]").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
  });

  document.querySelectorAll("[data-color]").forEach(btn => btn.onclick = () => {
    selectedColor = btn.dataset.color;
    document.querySelectorAll("[data-color]").forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
  });

  $("detailAdd").onclick = () => {
    addToCart(p._id, selectedSize, selectedColor);
    closeModal("productModal");
  };

  openModal("productModal");
}

function updateAccountUI() {
  $("accountBtn").textContent = state.user ? `Hi, ${state.user.name.split(" ")[0]}` : "Account";

  const old = document.getElementById("accountMenu");
  if (old) old.remove();

  if (state.user) {
    const menu = document.createElement("div");
    menu.id = "accountMenu";
    menu.style.cssText = "position:fixed;right:5%;top:65px;z-index:60;background:#fff;color:#222;border:1px solid #eee;padding:12px;border-radius:7px;box-shadow:0 15px 40px rgba(0,0,0,.2);min-width:190px";
    menu.innerHTML = `
      <b style="font-size:12px">${safeText(state.user.name)}</b>
      <small style="display:block;color:#777;margin:4px 0 10px">${safeText(state.user.email)}</small>
      <button id="myOrdersBtn" style="display:block;border:0;background:none;padding:7px 0;font-size:11px">My Orders</button>
      ${state.user.role === "Admin" ? `<button id="adminBtn" style="display:block;border:0;background:none;padding:7px 0;font-size:11px">Admin Dashboard</button>` : ""}
      <button id="logoutBtn" style="display:block;border:0;background:none;color:#9d3451;padding:7px 0;font-size:11px">Logout</button>`;
    document.body.appendChild(menu);
    $("myOrdersBtn").onclick = () => { menu.remove(); showOrders(); };
    if ($("adminBtn")) $("adminBtn").onclick = () => { menu.remove(); showAdmin(); };
    $("logoutBtn").onclick = () => {
      state.token = ""; state.user = null; saveState(); menu.remove(); updateAccountUI(); showToast("Logged out.");
    };
  }
}

async function showOrders() {
  if (!state.user) return openModal("authModal");
  $("orders").classList.remove("hidden");
  $("admin").classList.add("hidden");
  location.hash = "orders";

  try {
    const orders = await api("/api/orders/my");
    $("ordersList").innerHTML = orders.length ? orders.map(o => `
      <div class="order-card">
        <div>
          <b>Order #${String(o._id).slice(-7).toUpperCase()}</b>
          <p class="muted" style="font-size:11px">${new Date(o.createdAt).toLocaleDateString("en-IN")} · ${o.items.length} item(s)</p>
        </div>
        <div><b>${money(o.totalAmount)}</b><br><span class="status">${o.status}</span></div>
      </div>
    `).join("") : `<p class="empty-state">No orders yet. Your next favourite outfit could be the first.</p>`;
  } catch (e) { showToast(e.message); }
}

async function showAdmin() {
  if (state.user?.role !== "Admin") return showToast("Admin access required.");
  $("admin").classList.remove("hidden");
  $("orders").classList.add("hidden");
  location.hash = "admin";
  await loadAdmin();
}

async function loadAdmin() {
  try {
    const products = await api("/api/products");
    const orders = await api("/api/orders");

    $("adminProductCount").textContent = products.length;
    $("adminOrderCount").textContent = orders.length;
    $("adminPendingCount").textContent = orders.filter(o => o.status === "Pending").length;

    $("adminProducts").innerHTML = products.map(p => `
      <div class="admin-item">
        <div><b>${safeText(p.name)}</b><small>${safeText(p.category)} · ${money(p.price)} · Stock ${p.stock}</small></div>
        <button class="danger-btn" data-delete-product="${p._id}">Delete</button>
      </div>`).join("");

    $("adminOrders").innerHTML = orders.length ? orders.map(o => `
      <div class="admin-order-row">
        <div><b>#${String(o._id).slice(-7).toUpperCase()}</b><small>${safeText(o.user?.name || "Customer")} · ${money(o.totalAmount)}</small></div>
        <span class="status">${o.status}</span>
        <select data-order-status="${o._id}">
          ${["Pending","Confirmed","Shipped","Delivered","Cancelled"].map(s => `<option ${s===o.status?"selected":""}>${s}</option>`).join("")}
        </select>
      </div>`).join("") : `<p class="muted">No orders yet.</p>`;
  } catch (e) {
    showToast(e.message);
  }
}

document.addEventListener("click", e => {
  const add = e.target.closest("[data-add]");
  if (add) return addToCart(add.dataset.add);

  const view = e.target.closest("[data-view]");
  if (view) return openProduct(view.dataset.view);

  const wish = e.target.closest("[data-wish]");
  if (wish) {
    const id = String(wish.dataset.wish);
    state.wishlist = state.wishlist.includes(id) ? state.wishlist.filter(x => x !== id) : [...state.wishlist, id];
    saveState(); renderProducts();
    return showToast(state.wishlist.includes(id) ? "Added to wishlist." : "Removed from wishlist.");
  }

  const remove = e.target.closest("[data-remove]");
  if (remove) {
    state.cart = state.cart.filter(i => i.key !== remove.dataset.remove);
    saveState(); updateCartCount(); renderCart();
    return;
  }

  const qty = e.target.closest("[data-qty]");
  if (qty) {
    const item = state.cart.find(i => i.key === qty.dataset.qty);
    const product = state.products.find(p => String(p._id) === String(item?.product));
    if (!item) return;
    item.quantity += Number(qty.dataset.change);
    if (item.quantity <= 0) state.cart = state.cart.filter(i => i.key !== item.key);
    if (product && item.quantity > product.stock) item.quantity = product.stock;
    saveState(); updateCartCount(); renderCart();
  }

  const del = e.target.closest("[data-delete-product]");
  if (del) {
    if (!confirm("Delete this product?")) return;
    api(`/api/products/${del.dataset.deleteProduct}`, { method:"DELETE" })
      .then(() => { showToast("Product deleted."); loadProducts(); loadAdmin(); })
      .catch(err => showToast(err.message));
  }

  const status = e.target.closest("[data-order-status]");
  if (status) {
    api(`/api/orders/${status.dataset.orderStatus}/status`, { method:"PUT", body: JSON.stringify({status:status.value}) })
      .then(() => { showToast("Order status updated."); loadAdmin(); })
      .catch(err => showToast(err.message));
  }
});

document.querySelectorAll(".category-card").forEach(btn => btn.onclick = () => {
  state.filter = btn.dataset.category;
  document.querySelectorAll(".filter").forEach(b => b.classList.toggle("active", b.dataset.filter === state.filter));
  renderProducts();
  $("shop").scrollIntoView({ behavior:"smooth" });
});

document.querySelectorAll(".filter").forEach(btn => btn.onclick = () => {
  state.filter = btn.dataset.filter;
  document.querySelectorAll(".filter").forEach(b => b.classList.toggle("active", b === btn));
  renderProducts();
});

$("sortSelect").onchange = e => { state.sort = e.target.value; renderProducts(); };
$("searchInput").oninput = renderProducts;
$("searchBtn").onclick = renderProducts;
$("searchToggle").onclick = () => $("searchBarWrap").classList.toggle("open");
$("wishlistBtn").onclick = () => {
  const items = state.products.filter(p => state.wishlist.includes(String(p._id)));
  if (!items.length) return showToast("Your wishlist is empty.");
  showToast(`${items.length} item(s) saved to wishlist.`);
};

$("cartBtn").onclick = () => { renderCart(); openModal("cartModal"); };
$("accountBtn").onclick = () => state.user ? updateAccountUI() : openModal("authModal");

document.querySelectorAll("[data-close]").forEach(btn => btn.onclick = () => closeModal(btn.dataset.close));
document.querySelectorAll(".modal-backdrop").forEach(b => b.onclick = () => b.parentElement.classList.add("hidden"));

document.querySelectorAll(".auth-tab").forEach(tab => tab.onclick = () => {
  document.querySelectorAll(".auth-tab").forEach(t => t.classList.remove("active"));
  tab.classList.add("active");
  const register = tab.dataset.mode === "register";
  $("authTitle").textContent = register ? "Create Account" : "Login";
  $("authSubmit").textContent = register ? "Create Account" : "Login";
  $("authName").classList.toggle("hidden", !register);
  $("authName").required = register;
});

$("authForm").onsubmit = async e => {
  e.preventDefault();
  const form = new FormData(e.target);
  const register = !$("authName").classList.contains("hidden");

  try {
    const data = await api(`/api/auth/${register ? "register" : "login"}`, {
      method:"POST",
      body: JSON.stringify(Object.fromEntries(form.entries()))
    });
    state.token = data.token; state.user = data.user; saveState();
    closeModal("authModal"); updateAccountUI();
    showToast(`Welcome, ${state.user.name.split(" ")[0]}!`);
    e.target.reset();
    $("authName").classList.add("hidden");
  } catch (err) {
    $("authMsg").textContent = err.message;
  }
};

$("checkoutBtn").onclick = () => {
  if (!state.user) {
    closeModal("cartModal");
    openModal("authModal");
    return showToast("Please login before checkout.");
  }
  closeModal("cartModal");
  openModal("checkoutModal");
};

$("checkoutForm").onsubmit = async e => {
  e.preventDefault();
  const form = new FormData(e.target);
  const data = Object.fromEntries(form.entries());

  try {
    const order = await api("/api/orders", {
      method:"POST",
      body: JSON.stringify({
        items: state.cart,
        shippingAddress: {
          fullName:data.fullName, phone:data.phone, address:data.address,
          city:data.city, state:data.state, pincode:data.pincode
        },
        paymentMethod:data.paymentMethod
      })
    });

    state.cart = [];
    saveState(); updateCartCount();
    closeModal("checkoutModal");
    showToast(`Order #${String(order._id).slice(-7).toUpperCase()} placed successfully.`);
    e.target.reset();
    showOrders();
  } catch (err) {
    $("checkoutMsg").textContent = err.message;
  }
};

$("productForm").onsubmit = async e => {
  e.preventDefault();
  const form = new FormData(e.target);
  const data = Object.fromEntries(form.entries());

  const product = {
    name:data.name, category:data.category, price:Number(data.price), stock:Number(data.stock),
    image:data.image, description:data.description,
    sizes:data.sizes ? data.sizes.split(",").map(x=>x.trim()).filter(Boolean) : ["Standard"],
    colors:data.colors ? data.colors.split(",").map(x=>x.trim()).filter(Boolean) : ["Default"],
    featured:Boolean(data.featured)
  };

  try {
    await api("/api/products", { method:"POST", body:JSON.stringify(product) });
    e.target.reset(); showToast("Product added.");
    loadProducts(); loadAdmin();
  } catch (err) {
    $("adminProductMsg").textContent = err.message;
  }
};

$("contactForm").onsubmit = e => {
  e.preventDefault();
  $("contactMsg").textContent = "Thanks! Your message has been received for this demo.";
  e.target.reset();
};

window.addEventListener("scroll", () => document.querySelector(".navbar").classList.toggle("scrolled", scrollY > 20));

updateCartCount();
updateAccountUI();
loadProducts();
