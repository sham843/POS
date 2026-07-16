# काउंटर सेल (Counter Sale) - तांत्रिक माहिती आणि सर्व सीनेरिओज (Technical Scenarios & APIs)

हा डॉक्युमेंट 'काऊंटर सेल' मधील सर्व प्रक्रियांमध्ये बॅकएंडचे कोणते APIs कॉल होतात आणि डेटा कसा फिरतो (Data Flow), याबद्दल तांत्रिक (Technical) माहिती देतो. 

---

## १. मास्टर डेटा लोडिंग (Master Data Sync)
जेव्हा तुम्ही काउंटर सेल पेज उघडता, तेव्हा सुरुवातीलाच सर्व महत्त्वाचा डेटा API द्वारे आणून Local IndexedDB मध्ये सेव्ह केला जातो.
**Call होणारे APIs:**
- `GET api/v1/customer/customers` (ग्राहकांची लिस्ट)
- `GET api/v1/product/product` (सर्व प्रॉडक्ट्स)
- `GET api/v1/customer/bank-account`, `cash-ledger`, `company-ledger`, `sale-ledger` (सेटिंग्जसाठी लागणारा डेटा)

## २. ग्राहक (Customer) निवडण्याचे सीनेरिओज
जेव्हा तुम्ही एखादा जुना ग्राहक सर्च करून सिलेक्ट करता:
- **Ledger Balance:** त्या ग्राहकाचा आधीचा उरलेला बॅलन्स किंवा उधारी दाखवण्यासाठी API कॉल जातो.
- **Price List (रेट लिस्ट):** जर त्या विशिष्ट ग्राहकासाठी काही वेगळे रेट्स (Special Pricing) ठरवलेले असतील, तर प्रॉडक्ट सिलेक्ट करताना सिस्टीम **`GET api/v1/pricelist/GetRateList`** या API ला कॉल करते. 

## ३. प्रॉडक्ट कार्टमध्ये ऍड करणे (Product Addition)
- **Normal Customer (Walk-in):** ग्राहकाची निवड न केल्यास प्रॉडक्टच्या स्टँडर्ड (Standard) किमतीवरून (master data मधून) किंमत ठरते.
- **Specific Customer:** वर सांगितल्याप्रमाणे, प्रॉडक्ट ऍड करताना `GetRateList` API कॉल होतो आणि त्यातून मिळालेला 'Special Rate' प्रॉडक्टला लावला जातो.
- **Dynamic Tax Calculation:** प्रॉडक्टची किंमत आणि ग्राहकाचे राज्य (State Code) यावरून योग्य GST ठरवण्यासाठी कधीकधी **`GET api/v1/invoice/GetComputeTax`** हा API कॉल केला जातो.

## ४. Numpad चे गणिताचे सीनेरिओज (Numpad Engine)
Numpad हे फ्रंटएंडचं एक मोठं इंजिन आहे (Backend API विना चालणारं). 
- **Tax Inclusive प्रॉडक्ट्स:** जर रेट ५२० आणि Quantity १ असेल, तर Numpad स्वतःहून ५२० / १.०५ करून ४९५.२४ ही Taxable Amount (Amount Before Tax) आणि २४.७६ हा GST काढतं.
- **Discount:** टक्क्यांमध्ये (%) किंवा रुपयांमध्ये (₹) डिस्काउंट दिल्यास, ती सवलत 'Taxable Amount' मधून वजा होते आणि त्यावर नवीन GST कॅल्क्युलेट केला जातो.

## ५. मागील/ऑनलाइन ऑर्डर्स (Upcoming Orders)
- **Polling (सतत चालणारा कॉल):** दर ३०/६० सेकंदांनी **`GET api/v1/Order/getOrderList?status=Upcoming`** हा API कॉल होतो, जो फक्त लाल बॅजवरील आकडा (Count) अपडेट करतो.
- **ऑर्डरवर क्लिक केल्यावर:** जेव्हा तुम्ही ऑर्डर सिलेक्ट करता, तेव्हा **`GET api/v1/Order/getOrdersById`** ला कॉल जातो. 
- **मॅपिंग:** या API मधून मिळणारा `taxableAmount`, `cgst`, `sgst` आणि `afterTaxTotal` हा डेटा थेट कार्टच्या Numpad गणितांना ओव्हरराईड (Override) करतो, जेणेकरून फ्रंटएंड आणि बॅकएंडच्या हिशोबात १ पैशाचाही फरक (Rounding error) राहू नये.

## ६. पेमेंट आणि बिल बनवणे (Checkout Process & Invoice Save)
जेव्हा तुम्ही 'Cash' किंवा 'Online' बटण दाबून बिल फायनल करता:
- संपूर्ण कार्टमधील प्रॉडक्ट्स, कस्टमर आयडी, टॅक्सची रक्कम आणि निवडलेले 'Company Ledger', 'Cash Account' हे सर्व एका JSON (Payload) मध्ये बांधले जातात.
- **`POST api/v1/invoice/add`** (किंवा तत्सम Save API) ला कॉल करून हे बिल थेट डेटाबेसमध्ये सेव्ह केलं जातं. 
- त्यानंतर कार्ट रिकामी होते आणि 'Bill Saved Successfully' असा मेसेज येतो.


जर Price GST Inclusive असेल (उदा. ₹40 मध्ये 12% GST समाविष्ट आहे and 1 % Disc), तर Formula असा असेल:

Discount Amount
Discount = Selling Price × Discount % / 100
Final Amount (GST Inclusive)
Final Amount = Selling Price - Discount
Taxable Amount
Taxable Amount = Final Amount ÷ (1 + GST% / 100)
CGST
CGST = Taxable Amount × (GST% / 2) / 100
SGST
SGST = Taxable Amount × (GST% / 2) / 100
Final Check
Taxable + CGST + SGST = Final Amount
उदाहरण
Selling Price = ₹40
GST = 12%
Discount = 1%
Discount = ₹0.40
Final Amount = ₹39.60
Taxable = ₹39.60 ÷ 1.12 = ₹35.36
CGST (6%) = ₹2.12
SGST (6%) = ₹2.12
Total = ₹39.60 ✅

Rule (Short):
Discount आधी → मग GST Reverse Calculate → मग CGST/SGST Calculate.