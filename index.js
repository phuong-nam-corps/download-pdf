const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const md5 = require("md5");

const app = express();
const port = process.env.PORT || 8586;

app.get("/download/:base64/:code", async (req, res) => {
    const { base64, code } = req.params;
    const url = Buffer.from(base64.replace(/__/g, "/").replace(/--/g, "+"), "base64").toString("utf-8");
    
    const hash = md5(url);

    const pageUrl = url;

    if (!pageUrl) {
        return res.status(400).send("URL is required");
    }

    try {
        const folder = path.join(__dirname, "output");

        // Tạo thư mục `output` nếu chưa tồn tại
        if (!fs.existsSync(folder)) {
            fs.mkdirSync(folder, { recursive: true });
        }

        // Đặt tên file PDF và đường dẫn lưu trữ
        const fileName = `${hash}.pdf`;
        const filePath = path.join(folder, fileName);

        if (fs.existsSync(filePath)) {
            console.log("File already exists, sending file directly...");
            return res.sendFile(filePath);
        }

        // Khởi tạo puppeteer và mở trình duyệt
        const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
        const page = await browser.newPage();

        // Mở URL và render trang web
        await page.goto(pageUrl, { waitUntil: "networkidle2" });

        // Tạo file PDF từ nội dung trang web
        await page.pdf({
            path: filePath,
            width: "190mm",
            height: "140mm",
            printBackground: true,
        });

        // Đóng trình duyệt
        await browser.close();

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${code}.pdf"`); // Inline để hiển thị PDF thay vì tải về
        // res.send(pdfBuffer);
        res.sendFile(filePath);

        // Trả về file PDF cho người dùng
        // res.download(filePath, fileName, (err) => {
        //     if (err) {
        //         return res.status(500).send("Error downloading the file");
        //     }
        //     // Xóa file sau khi tải xong
        //     fs.unlinkSync(filePath);
        // });
    } catch (error) {
        console.log(error);
        res.status(500).send("Error rendering the page to PDF");
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
