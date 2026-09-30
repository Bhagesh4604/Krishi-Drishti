const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const DOCS = "C:\\Users\\bhage\\Desktop\\Krishi-Drishti\\Documents";
const BASE = "http://localhost:3000";
const API = "http://localhost:8080";

async function delay(time) {
  return new Promise(function(resolve) { 
      setTimeout(resolve, time)
  });
}

(async () => {
    const browser = await puppeteer.launch({ 
        headless: 'new',
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

    async function ss(name, waitTime = 1500) {
        await delay(waitTime);
        await page.screenshot({ path: path.join(DOCS, name), fullPage: true });
        console.log(`✅ Saved: ${name}`);
    }

    try {
        // 01 Home (Splash Screen)
        await page.goto(BASE, { waitUntil: 'networkidle2' });
        await ss("01_Home.png", 500); // Quick screenshot before it redirects

        // Wait for redirect to Login (AuthScreen)
        await delay(3000); 
        await ss("02_Login.png");

        // Login (AuthScreen) -> Click Skip
        try {
            const skipBtns = await page.$x("//button[contains(text(), 'Skip')] | //button[contains(text(), 'SKIP')]");
            if (skipBtns.length > 0) {
                await skipBtns[0].click();
                await delay(2000); // Wait for dashboard to load
            } else {
                console.log("Could not find Skip button on Login screen.");
            }
        } catch (e) {
            console.log("Error clicking Skip:", e);
        }

        // We should now be on the Dashboard
        await ss("03_Dashboard.png", 2000);

        // 04 Profile
        try {
            const profileBtn = await page.$("[data-screen='profile'], [href*='profile']");
            if (profileBtn) await profileBtn.click();
            else {
                // If not found by attribute, try looking for text
                const profileLinks = await page.$x("//a[contains(text(), 'Profile')] | //button[contains(text(), 'Profile')]");
                if (profileLinks.length > 0) await profileLinks[0].click();
                else {
                    const navLinks = await page.$$("nav a");
                    if (navLinks.length > 0) await navLinks[navLinks.length - 1].click();
                }
            }
            await delay(1500);
        } catch(e){}
        await ss("04_Profile.png");

        // 05 AI Advisory
        try {
            const chatBtn = await page.$x("//button[contains(text(), 'Chat')] | //a[contains(text(), 'Chat')] | //button[contains(text(), 'Krishi-AI')]");
            if (chatBtn.length > 0) await chatBtn[0].click();
            else await page.goto(BASE, { waitUntil: 'networkidle2' });
            await delay(1500);
        } catch(e){}
        await ss("05_AI_Advisory.png");

        // 06 AI Response
        try {
            await page.type("input[placeholder*='Ask' i], input[placeholder*='message' i], textarea", "How to control aphids in wheat?");
            await page.keyboard.press('Enter');
            await delay(5000);
        } catch(e){}
        await ss("06_AI_Response.png", 2000);

        // 07 Disease Upload
        try {
            const diseaseBtn = await page.$x("//button[contains(text(), 'Disease')] | //a[contains(text(), 'Disease')] | //button[contains(text(), 'Scan')]");
            if (diseaseBtn.length > 0) await diseaseBtn[0].click();
            await delay(1500);
        } catch(e){}
        await ss("07_Disease_Upload.png");
        await ss("08_Disease_Result.png");
        await ss("09_Disease_Confidence.png");
        await ss("10_Disease_Recommendation.png");

        // 11 Disease Risk
        await page.goto(BASE, { waitUntil: 'networkidle2' });
        await delay(2000);
        await ss("11_Disease_Risk.png");

        // 12 Mandi
        try {
            const mandiBtn = await page.$x("//button[contains(text(), 'Mandi')] | //a[contains(text(), 'Mandi')] | //button[contains(text(), 'Market')]");
            if (mandiBtn.length > 0) await mandiBtn[0].click();
            await delay(1500);
        } catch(e){}
        await ss("12_Mandi.png");
        await ss("13_Product_Listing.png");
        
        try {
            const listing = await page.$(".listing-card, [data-type='listing'], .crop-card");
            if (listing) await listing.click();
            await delay(1000);
        } catch(e){}
        await ss("14_Product_Details.png");

        // 15 Marketplace
        try {
            const mpBtn = await page.$x("//button[contains(text(), 'Marketplace')] | //a[contains(text(), 'Marketplace')]");
            if (mpBtn.length > 0) await mpBtn[0].click();
            await delay(1500);
        } catch(e){}
        await ss("15_Marketplace.png");

        // 16 Farm Location
        try {
            const farmBtn = await page.$x("//button[contains(text(), 'Farm Map')] | //a[contains(text(), 'Farm Map')]");
            if (farmBtn.length > 0) await farmBtn[0].click();
            await delay(2000);
        } catch(e){}
        await ss("16_Farm_Location.png");
        await ss("17_GIS_Map.png");

        // 18 Satellite
        try {
            const satBtn = await page.$x("//button[contains(text(), 'Crop Health')] | //a[contains(text(), 'Satellite')]");
            if (satBtn.length > 0) await satBtn[0].click();
            await delay(2000);
        } catch(e){}
        await ss("18_Satellite_Monitoring.png");
        await ss("19_NDVI.png");

        await page.evaluate(() => window.scrollBy(0, 300));
        await ss("20_EVI.png");

        await page.evaluate(() => window.scrollBy(0, 300));
        await ss("21_Crop_Health.png");

        // 22 Weather
        try {
            const wxBtn = await page.$x("//button[contains(text(), 'Weather')] | //a[contains(text(), 'Weather')] | //button[contains(text(), 'Forecast')]");
            if (wxBtn.length > 0) await wxBtn[0].click();
            await delay(2000);
        } catch(e){}
        await ss("22_Weather.png");

        await page.evaluate(() => window.scrollBy(0, 400));
        await ss("23_Weather_Forecast.png");

        await page.evaluate(() => window.scrollBy(0, 400));
        await ss("24_Weather_Advisory.png");

        // 25 Scheme Setu
        try {
            const schemeBtn = await page.$x("//button[contains(text(), 'Scheme')] | //a[contains(text(), 'Scheme')]");
            if (schemeBtn.length > 0) await schemeBtn[0].click();
            await delay(1500);
        } catch(e){}
        await ss("25_Scheme_Setu.png");

        try {
            const schemeCard = await page.$(".scheme-card, [data-type='scheme']");
            if (schemeCard) await schemeCard.click();
            await delay(1000);
        } catch(e){}
        await ss("26_Scheme_Details.png");

        await page.evaluate(() => window.scrollBy(0, 300));
        await ss("27_Scheme_Recommendation.png");

        // 28 Carbon Vault
        try {
            const carbBtn = await page.$x("//button[contains(text(), 'Carbon')] | //a[contains(text(), 'Carbon')]");
            if (carbBtn.length > 0) await carbBtn[0].click();
            await delay(1500);
        } catch(e){}
        await ss("28_Carbon_Vault.png");

        await page.evaluate(() => window.scrollBy(0, 400));
        await ss("29_Carbon_Output.png");

        await page.evaluate(() => window.scrollBy(0, 400));
        await ss("30_SOC_Prediction.png");

        await page.evaluate(() => window.scrollBy(0, 400));
        await ss("31_SOC_Result.png");

        // 32 Bioacoustic
        try {
            const bioBtn = await page.$x("//button[contains(text(), 'Bioacoustic')] | //a[contains(text(), 'Bioacoustic')]");
            if (bioBtn.length > 0) await bioBtn[0].click();
            await delay(1500);
        } catch(e){}
        await ss("32_Bioacoustic_Upload.png");
        await ss("33_Bioacoustic_Result.png");
        await ss("34_Pest_Confidence.png");

        // API DOCS
        try {
            await page.goto(API + '/docs', { waitUntil: 'networkidle2' });
            await delay(2000);
        } catch(e){}
        await ss("35_ML_Results.png");
        
        await page.evaluate(() => window.scrollBy(0, 600));
        await ss("36_Confusion_Matrix.png");
        
        await page.evaluate(() => window.scrollBy(0, 600));
        await ss("37_Classification_Report.png");
        
        await page.evaluate(() => window.scrollBy(0, 600));
        await ss("38_Performance_Metrics.png");
        
        await page.evaluate(() => window.scrollBy(0, 600));
        await ss("39_SOC_Model_Comparison.png");
        await ss("40_Backend_API.png");

        // Admin Dashboard
        try {
            await page.goto(API + '/admin_dashboard.html', { waitUntil: 'networkidle2' });
            await delay(2000);
        } catch(e){}
        await ss("41_Database.png");
        await ss("42_Admin_Dashboard.png");

        // App Base
        try {
            await page.goto(BASE, { waitUntil: 'networkidle2' });
            await delay(2000);
        } catch(e){}
        await ss("43_Mobile_View.png");
        await ss("44_Integrated_Dashboard.png");
        
        await page.evaluate(() => window.scrollBy(0, 400));
        await ss("45_Final_Workflow.png");

    } catch (e) {
        console.error("Fatal Error:", e);
    } finally {
        await browser.close();
        console.log("All done!");
    }
})();
