const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const matter = require('gray-matter');
const md = require('markdown-it')();

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.use(express.static('public'));

const CONTENT_DIR = path.join(__dirname, 'content');

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
        res.render('index', { posts });
    } catch (err) {
        res.status(500).send("Error while read the content: " + err.message);
    }
});

app.get('/post/:slug', async (req, res) => {
    try {
        const filePath = path.join(CONTENT_DIR, `${req.params.slug}.md`);
        if (!fs.existsSync(filePath)) return res.status(404).send("Article not found");
        
        const { data, content } = matter(fs.readFileSync(filePath, 'utf-8'));
        res.render('post', { 
            metadata: data, 
            content: md.render(content)
        });
    } catch (err) {
        res.status(500).send("Error while process the article.");
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server jalan di http://localhost:${PORT}`);
});