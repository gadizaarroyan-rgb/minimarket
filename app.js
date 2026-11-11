let produkList = [];
localStorage.clear();

let keranjang = [];
let totalOmzetHarian = parseInt(localStorage.getItem('pos_omzet')) || 0;
let jumlahTransaksiBerjalan = parseInt(localStorage.getItem('pos_trx')) || 0;

// Render tampilan saat pertama kali halaman dibuka
document.addEventListener("DOMContentLoaded", () => {
    renderKatalog();
    renderKeranjang();
    updateStatistik();
});

// 1. Fungsi Tambah Produk Baru
document.getElementById("form-produk").addEventListener("submit", function(e) {
    e.preventDefault();
    const nama = document.getElementById("nama-produk").value;
    const harga = parseInt(document.getElementById("harga-produk").value);
    const stok = parseInt(document.getElementById("stok-produk").value);

    const produkBaru = {
        id: Date.now(),
        nama,
        harga,
        stok
    };

    produkList.push(produkBaru);
    simpanKeLocalStorage();
    renderKatalog();
    
    this.reset();
});

// 2. Render Katalog & Dynamic Badge Alerts Stok
function renderKatalog() {
    const container = document.getElementById("katalog-container");
    container.innerHTML = "";

    if (produkList.length === 0) {
        container.innerHTML = `<p class="text-slate-400 text-sm col-span-2">Belum ada produk tersimpan.</p>`;
        return;
    }

    produkList.forEach(produk => {
        // Tentukan warna Dynamic Badge berdasarkan jumlah stok
        let badgeColor = "bg-emerald-100 text-emerald-700";
        let statusStok = `Stok Aman: ${produk.stok}`;
        
        if (produk.stok === 0) {
            badgeColor = "bg-rose-100 text-rose-700";
            statusStok = "Stok Habis";
        } else if (produk.stok < 5) {
            badgeColor = "bg-amber-100 text-amber-700";
            statusStok = `Stok Menipis: ${produk.stok}`;
        }

        const card = document.createElement("div");
        card.className = "bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between";
        card.innerHTML = `
            <div>
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-bold text-slate-800">${produk.nama}</h3>
                    <span class="text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}">${statusStok}</span>
                </div>
                <p class="text-indigo-600 font-semibold mb-4">Rp ${produk.harga.toLocaleString('id-ID')}</p>
            </div>
            <button onclick="tambahKeKeranjang(${produk.id})" 
                class="w-full py-1.5 rounded-lg text-sm font-medium transition ${produk.stok === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-100 hover:bg-indigo-50 text-indigo-600'}"
                ${produk.stok === 0 ? 'disabled' : ''}>
                ${produk.stok === 0 ? 'Habis' : '+ Tambah ke Keranjang'}
            </button>
        `;
        container.appendChild(card);
    });
    updateStatistik();
}

// 3. Logika Keranjang Belanja
function tambahKeKeranjang(id) {
    const produk = produkList.find(p => p.id === id);
    if (!produk || produk.stok <= 0) return;

    // Kurangi stok sementara di katalog
    produk.stok--;

    const itemDiKeranjang = keranjang.find(item => item.id === id);
    if (itemDiKeranjang) {
        itemDiKeranjang.qty++;
    } else {
        keranjang.push({ id: produk.id, nama: produk.nama, harga: produk.harga, qty: 1 });
    }

    renderKatalog();
    renderKeranjang();
}

function renderKeranjang() {
    const container = document.getElementById("keranjang-container");
    container.innerHTML = "";

    if (keranjang.length === 0) {
        container.innerHTML = `<p class="text-slate-400 text-center py-4">Keranjang masih kosong</p>`;
        document.getElementById("grand-total").innerText = "Rp 0";
        return;
    }

    let grandTotal = 0;
    keranjang.forEach(item => {
        let subtotal = item.harga * item.qty;
        grandTotal += subtotal;

        const row = document.createElement("div");
        row.className = "py-2 flex justify-between items-center";
        row.innerHTML = `
            <div>
                <p class="font-medium text-slate-700">${item.nama}</p>
                <p class="text-xs text-slate-400">${item.qty} x Rp ${item.harga.toLocaleString('id-ID')}</p>
            </div>
            <span class="font-semibold text-slate-800">Rp ${subtotal.toLocaleString('id-ID')}</span>
        `;
        container.appendChild(row);
    });

    document.getElementById("grand-total").innerText = `Rp ${grandTotal.toLocaleString('id-ID')}`;
    
    // Validasi Kalkulator Kembalian Real-Time
    hitungKembalian(grandTotal);
}

// 4. Kalkulator Kembalian Otomatis
document.getElementById("uang-tunai").addEventListener("input", function() {
    let grandTotal = keranjang.reduce((sum, item) => sum + (item.harga * item.qty), 0);
    hitungKembalian(grandTotal);
});

function hitungKembalian(grandTotal) {
    const uangTunai = parseInt(document.getElementById("uang-tunai").value) || 0;
    const infoKembalian = document.getElementById("info-kembalian");
    
    let kembalian = uangTunai - grandTotal;
    if (kembalian >= 0) {
        infoKembalian.innerText = `Rp ${kembalian.toLocaleString('id-ID')}`;
        infoKembalian.className = "font-bold text-emerald-600";
    } else {
        infoKembalian.innerText = `Uang Kurang (Kurang Rp ${Math.abs(kembalian).toLocaleString('id-ID')})`;
        infoKembalian.className = "font-bold text-rose-600";
    }
}

// 5. Proses Transaksi & Cetak Nota Digital (`window.print`)
function prosesTransaksi() {
    if (keranjang.length === 0) {
        alert("Keranjang masih kosong!");
        return;
    }

    let grandTotal = keranjang.reduce((sum, item) => sum + (item.harga * item.qty), 0);
    const uangTunai = parseInt(document.getElementById("uang-tunai").value) || 0;
    const metode = document.getElementById("metode-pembayaran").value;

    if (metode === "Tunai" && uangTunai < grandTotal) {
        alert("Jumlah uang tunai tidak mencukupi!");
        return;
    }

    // Update Statistik Omzet & Transaksi
    totalOmzetHarian += grandTotal;
    jumlahTransaksiBerjalan++;
    
    simpanKeLocalStorage();
    updateStatistik();

    // Buat Pop-up Cetak Nota Sederhana menggunakan window.print()
    let strukHTML = `
        <div style="font-family: monospace; padding: 20px; width: 300px;">
            <h3 style="text-align:center;">=== STRUK PEMBAYARAN ===</h3>
            <p style="text-align:center;">SMKN 9 MEDAN - MINI POS</p>
            <p>-----------------------------------</p>
            <p>Metode: ${metode}</p>
            <p>Waktu: ${new Date().toLocaleString('id-ID')}</p>
            <p>-----------------------------------</p>
    `;
    
    keranjang.forEach(item => {
        strukHTML += `<p>${item.nama} x${item.qty} = Rp ${(item.harga * item.qty).toLocaleString('id-ID')}</p>`;
    });

    strukHTML += `
            <p>-----------------------------------</p>
            <p><b>TOTAL: Rp ${grandTotal.toLocaleString('id-ID')}</b></p>
            ${metode === "Tunai" ? `<p>Bayar: Rp ${uangTunai.toLocaleString('id-ID')}</p><p>Kembali: Rp ${(uangTunai - grandTotal).toLocaleString('id-ID')}</p>` : ''}
            <p style="text-align:center; margin-top: 20px;">Terima Kasih!</p>
        </div>
    `;

    // Buka jendela cetak baru
    let winPrint = window.open('', '', 'width=400,height=600');
    winPrint.document.write(strukHTML);
    winPrint.document.close();
    winPrint.focus();
    winPrint.print();
    winPrint.close();

    // Reset Keranjang setelah transaksi sukses
    keranjang = [];
    document.getElementById("uang-tunai").value = "";
    renderKeranjang();
    renderKatalog();
}

// 6. Update Statistik Atas & Simpan State Local Storage
function updateStatistik() {
    document.getElementById("total-omzet").innerText = `Rp ${totalOmzetHarian.toLocaleString('id-ID')}`;
    
    let totalSisaStok = produkList.reduce((sum, p) => sum + p.stok, 0);
    document.getElementById("total-stok").innerText = totalSisaStok;
    document.getElementById("jumlah-transaksi").innerText = jumlahTransaksiBerjalan;
}

function simpanKeLocalStorage() {
    localStorage.setItem('pos_produk', JSON.stringify(produkList));
    localStorage.setItem('pos_omzet', totalOmzetHarian);
    localStorage.setItem('pos_trx', jumlahTransaksiBerjalan);
}