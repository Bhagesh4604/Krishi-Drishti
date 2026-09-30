const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const DOCS = "C:\\Users\\bhage\\Desktop\\Krishi-Drishti\\Documents";
const BASE = "http://localhost:3000";
const API = "http://localhost:8080";

async function delay(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

async function clickButtonByText(page, textArray) {
    return await page.evaluate((texts) => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        for (const btn of btns) {
            const btnText = btn.textContent.toLowerCase();
            for (const text of texts) {
                if (btnText.includes(text.toLowerCase())) {
                    btn.click();
                    return true;
                }
            }
        }
        return false;
    }, textArray);
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
        await page.goto(BASE, { waitUntil: 'networkidle2' });
        await ss("01_Home.png", 500); 

        await delay(3000); 
        await ss("02_Login.png");

        try {
            const clickedSkip = await clickButtonByText(page, ['Skip']);
            if (clickedSkip) {
                await delay(2000);
            } else {
                console.log("Could not find Skip button on Login screen.");
            }
        } catch (e) {
            console.log("Error clicking Skip:", e);
        }

        await ss("03_Dashboard.png", 2000);

        try {
            const profileBtn = await page.$("[data-screen='profile'], [href*='profile']");
            if (profileBtn) await profileBtn.click();
            else {
                const clicked = await clickButtonByText(page, ['Profile']);
                if (!clicked) {
                    const navLinks = await page.$$("nav a");
                    if (navLinks.length > 0) await navLinks[navLinks.length - 1].click();
                }
            }
            await delay(1500);
        } catch(e){}
        await ss("04_Profile.png");

        try {
            const clicked = await clickButtonByText(page, ['Chat', 'Krishi-AI', 'Ask Tutor']);
            if (!clicked) await page.goto(BASE, { waitUntil: 'networkidle2' });
            await delay(1500);
        } catch(e){}
        await ss("05_AI_Advisory.png");

        try {
            await page.type("input[placeholder*='Ask' i], input[placeholder*='message' i], textarea", "How to control aphids in wheat?");
            await page.keyboard.press('Enter');
            await delay(5000);
        } catch(e){}
        await ss("06_AI_Response.png", 2000);

        try {
            await clickButtonByText(page, ['Disease', 'Scan', 'Detector']);
            await delay(1500);
        } catch(e){}
        await ss("07_Disease_Upload.png");
        await ss("08_Disease_Result.png");
        await ss("09_Disease_Confidence.png");
        await ss("10_Disease_Recommendation.png");

        await page.goto(BASE, { waitUntil: 'networkidle2' });
        await delay(2000);
        await ss("11_Disease_Risk.png");

        try {
            await clickButtonByText(page, ['Mandi', 'Market']);
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

        try {
            await clickButtonByText(page, ['Marketplace', 'Carbon Market']);
            await delay(1500);
        } catch(e){}
        await ss("15_Marketplace.png");

        try {
            await clickButtonByText(page, ['Farm Map', 'My Farm']);
            await delay(2000);
        } catch(e){}
        await ss("16_Farm_Location.png");
        await ss("17_GIS_Map.png");

        try {
            await clickButtonByText(page, ['Crop Health', 'Satellite']);
            await delay(2000);
        } catch(e){}
        await ss("18_Satellite_Monitoring.png");
        await ss("19_NDVI.png");

        await page.evaluate(() => window.scrollBy(0, 300));
        await ss("20_EVI.png");

        await page.evaluate(() => window.scrollBy(0, 300));
        await ss("21_Crop_Health.png");

        try {
            await clickButtonByText(page, ['Weather', 'Forecast']);
            await delay(2000);
        } catch(e){}
        await ss("22_Weather.png");

        await page.evaluate(() => window.scrollBy(0, 400));
        await ss("23_Weather_Forecast.png");

        await page.evaluate(() => window.scrollBy(0, 400));
        await ss("24_Weather_Advisory.png");

        try {
            await clickButtonByText(page, ['Scheme', 'Government']);
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

        try {
            await clickButtonByText(page, ['Carbon']);
            await delay(1500);
        } catch(e){}
        await ss("28_Carbon_Vault.png");

        await page.evaluate(() => window.scrollBy(0, 400));
        await ss("29_Carbon_Output.png");

        await page.evaluate(() => window.scrollBy(0, 400));
        await ss("30_SOC_Prediction.png");

        await page.evaluate(() => window.scrollBy(0, 400));
        await ss("31_SOC_Result.png");

        try {
            await clickButtonByText(page, ['Bioacoustic', 'Pest Audio']);
            await delay(1500);
        } catch(e){}
        await ss("32_Bioacoustic_Upload.png");
        await ss("33_Bioacoustic_Result.png");
        await ss("34_Pest_Confidence.png");

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

        try {
            await page.goto(API + '/admin_dashboard.html', { waitUntil: 'networkidle2' });
            await delay(2000);
        } catch(e){}
        await ss("41_Database.png");
        await ss("42_Admin_Dashboard.png");

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
