const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
var escpos = require("escpos");
const fs = require("fs");
escpos.USB = require("escpos-usb");
const path = require("path");
const app = express();
app.use(cors());
app.use(bodyParser.json());

let device;
let printer;
let printerConnected = false;

const VENDOR_ID = 0x1fc9;
const PRODUCT_ID = 0x2016;

app.get("/printer-status", (req, res) => {
  res.json({
    success: true,
    message: printerConnected
      ? "✅ Printer is connected"
      : "❌ Printer is NOT connected",
    printerConnected,
  });
});

app.get("/printer-online", (req, res) => {
  try {
    device.open((err) => {
      if (err) {
        console.error("❌ Printer connection failed:", err);
        return res.json({ success: false, message: "Printer offline" });
      }

      console.log("✅ Printer is online....");
      res.json({ success: true, message: "Printer is online" });
    });
  } catch (error) {
    console.error("❌ Error checking printer status:", error);
    retryConnection();
    res.status(500).json({ success: false, message: "Printer error" });
  }
});

app.post("/print", (req, res) => {
  const {
    totalBill,
    discountAmount,
    discount,
    changeAmount,
    subTotal,
    cashAmount,
    date,
    time,
    cart,
    customer = "GENERAL",
    billNo,
  } = req.body;

  console.log(req.body);

  if (!cart || cart.length === 0) {
    return res.status(400).json({ success: false, message: "Cart is empty" });
  }

  device.open(async (err) => {
    if (err) {
      console.error("❌ Printer connection failed:", err);
      return res
        .status(500)
        .json({ success: false, message: "Printer connection error" });
    }

    try {
      const logoPath = path.join(__dirname, "logo.png");

      console.log(logoPath);
      //text bold
      printer
        .align("ct")
        .style("b")
        .size(1, 1)
        .text("The Cadbury")
        .size(0.5, 0.5)
        .style("normal");

      printer
        .align("ct")
        .text("Taste the Magic at The Cadbury.")
        .text("No 395/10A, Galle Road, Colombo 03")
        .text("Tel: 070 025 2511");

      printer
        .align("lt")
        .text("----------------------------------------------")
        .text("RETAIL SALE BILL")
        .text("----------------------------------------------")
        .text(`Date: ${date}            Time: ${time}`)
        .text(`Invoice No: ${billNo}`)
        .text(`Sales Ref: Manager`)
        .text(`Customer: ${customer}`)
        .text("----------------------------------------------");
      printer.tableCustom([
        { text: "DESCRIPTION", align: "LEFT", width: 0.4 },
        { text: "QTY", align: "LEFT", width: 0.12 },
        { text: "PRICE", align: "RIGHT", width: 0.2 },
        { text: "AMOUNT", align: "RIGHT", width: 0.25 },
      ]);

      printer.text("----------------------------------------------");

      cart.forEach((item) => {
        printer.tableCustom([
          { text: item.name.substring(0, 15), align: "LEFT", width: 0.4 },
          { text: `${item.quantity}`, align: "LEFT", width: 0.12 },
          {
            text: `${Number(item.price).toFixed(2)}`,
            align: "RIGHT",
            width: 0.2,
          },
          {
            text: `${(item.quantity * item.price).toFixed(2)}`,
            align: "RIGHT",
            width: 0.25,
          },
        ]);
      });

      printer
        .text("----------------------------------------------")
        .align("lt")
        .text(
          `SUB TOTAL      `.padEnd(20) +
            `Rs ${Number(subTotal).toFixed(2)}`.padStart(26)
        )
        .text(`SC             `.padEnd(20) + `Rs 0.00`.padStart(26))
        .text(`DISCOUNT       `.padEnd(20) + `${discount} %`.padStart(26))
        .text(
          `DISCOUNT AMOUNT     `.padEnd(20) +
            `Rs ${discountAmount.toFixed(2)}`.padStart(26)
        )
        .text(
          `NET AMOUNT     `.padEnd(20) +
            `Rs ${totalBill.toFixed(2)}`.padStart(26)
        )
        .text("----------------------------------------------");

      if (cashAmount > 0) {
        printer
          .align("lt")
          .text(
            `CUSTOMER PAID  `.padEnd(20) +
              `Rs ${cashAmount.toFixed(2)}`.padStart(26)
          )
          .text(
            `BALANCE        `.padEnd(20) +
              `Rs ${changeAmount.toFixed(2)}`.padStart(26)
          )
          .text("----------------------------------------------");
      }

      printer
        .align("ct")
        .text(" THANK YOU PLEASE COME AGAIN!  ")
        .feed(4)
        .cut()
        .close();

      console.log("✅ Receipt printed successfully!");
      res.json({ success: true, message: "Receipt printed successfully!" });
    } catch (error) {
      console.error("❌ Error printing receipt:", error);
      res.status(500).json({ success: false, message: "Printing error" });
    }
  });
});

const connectPrinter = () => {
  try {
    console.log("🔄 Attempting to connect to printer...");
    device = new escpos.USB(VENDOR_ID, PRODUCT_ID);
    printer = new escpos.Printer(device);

    device.open((error) => {
      if (error) {
        console.error("❌ Printer connection failed:", error);
        printerConnected = false;
        retryConnection();
      } else {
        console.log("✅ 🖨️ Printer successfully connected!");
        printerConnected = true;
      }
    });
  } catch (error) {
    console.error("❌ Unexpected error while connecting:", error);
    printerConnected = false;
    retryConnection();
  }
};
const retryConnection = () => {
  console.log("🔄 Retrying printer connection in 5 seconds...");
  setTimeout(connectPrinter, 5000);
};

connectPrinter();

const PORT = 5000;
app.listen(PORT, () =>
  console.log(`🖨️ Print server running on http://localhost:${PORT}`)
);
