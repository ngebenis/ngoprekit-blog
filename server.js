const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');
const md = require('markdown-it')();
const session = require('express-session');

const app = express();
const PORT = 3000;

// Konfigurasi Session
app.use(session({
    secret: 'ngoprek-it-key-2026',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 } // Session berlaku 1 jam
}));

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

const CONTENT_DIR = path.join(__dirname, 'content');
const ADMIN_PASSWORD = 'sup3r10r!'; // Silakan ganti password Anda

// Middleware Proteksi
const authMiddleware = (req, res, next) => {
    if (req.session.isLoggedIn) return next();
    res.redirect('/login');
};

// --- AUTH ROUTES ---
app.get('/login', (req, res) => {
    res.render('login'); // Buat file login.ejs sederhana atau gunakan res.send
});

app.post('/login', (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
        req.session.isLoggedIn = true;
        res.redirect('/admin');
    } else {
        res.send('Password salah! <a href="/login">Kembali</a>');
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// --- BLOG ROUTES ---
app.get('/', async (req, res) => {
    try {
        if (!fs.existsSync(CONTENT_DIR)) await fs.ensureDir(CONTENT_DIR);
        const files = await fs.readdir(CONTENT_DIR);
        
        const posts = files.filter(f => f.endsWith('.md')).map(f => {
            const fileContent = fs.readFileSync(path.join(CONTENT_DIR, f), 'utf-8');
            const { data } = matter(fileContent);
            return { slug: f.replace('.md', ''), ...data };
        }).filter(p => p.published);

        res.render('index', { posts, isLoggedIn: req.session.isLoggedIn });
    } catch (err) {
        res.status(500).send("Error membaca konten: " + err.message);
    }
});

app.get('/post/:slug', async (req, res) => {
    try {
        const filePath = path.join(CONTENT_DIR, `${req.params.slug}.md`);
        if (!fs.existsSync(filePath)) return res.status(404).send("Artikel tidak ditemukan");
        
        const { data, content } = matter(fs.readFileSync(filePath, 'utf-8'));
        res.render('post', { 
            metadata: data, 
            content: md.render(content),
            isLoggedIn: req.session.isLoggedIn 
        });
    } catch (err) {
        res.status(500).send("Error memproses artikel.");
    }
});

// --- ADMIN ROUTES ---
app.get('/admin', authMiddleware, (req, res) => {
    res.render('admin', { isLoggedIn: true });
});

app.post('/admin/save', authMiddleware, async (req, res) => {
    try {
        const { title, slug, category, content } = req.body;
        const frontMatter = {
            title,
            date: new Date().toISOString().split('T')[0],
            category,
            published: true
        };
        const fileFullContent = matter.stringify(content, frontMatter);
        await fs.writeFile(path.join(CONTENT_DIR, `${slug}.md`), fileFullContent);
        res.redirect('/');
    } catch (err) {
        res.status(500).send("Gagal menyimpan artikel.");
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server jalan di http://localhost:${PORT}`);
});