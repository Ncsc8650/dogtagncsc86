# NCSC86 Dog Tag Order

เว็บฟอร์มสำหรับบันทึกคำสั่งทำ dog tag รุ่น NCSC86 พร้อม preview 3D, สร้างภาพ PNG ด้านหน้าและด้านหลัง, และบันทึกข้อมูลลง Google Sheets

## ใช้งานบนเครื่อง

```bash
node server.js
```

หรือเปิดผ่าน static server อื่นจากโฟลเดอร์นี้ได้เลย

## เชื่อม Google Sheets

1. เปิด Google Apps Script แล้วสร้างโปรเจกต์ใหม่
2. วางโค้ดจาก `scripts/google-apps-script.gs`
3. Deploy เป็น Web app
4. ตั้งค่า Execute as เป็นบัญชีของคุณ และ Who has access เป็น Anyone with the link
5. คัดลอก Web app URL ไปใส่ใน `app.js` ตรง `GOOGLE_SCRIPT_URL`

Google Sheet ที่ตั้งไว้:

```text
https://docs.google.com/spreadsheets/d/1bEdeom9G5LzamOw0Jm11Ko9ZwbUDggfJkWy5Ehql9Yg/edit
```

หัวตารางที่ใช้:

```text
วันที่บันทึก | ยศ-ชื่อ | นามสกุล | เลขอัตราข้าราชการ | NCSC NO. | หมู่เลือด | รหัสลับ | ลิงก์ภาพด้านหน้า | ลิงก์ภาพด้านหลัง | ลิงก์ดาวน์โหลดภาพ
```
