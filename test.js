(async ({license,state})=>{
    const res = await fetch(`https://apik.carvana.io/stc/trades/api/v5/vehicleconfiguration/plateLookup/${state}/${license}/327dc11a-af8c-bfd2-15b0-a4cb117a9809`, {
        "headers": {
          "accept": "application/json, text/plain, */*",
          "accept-language": "en-US,en;q=0.9",
          "authorization": "Bearer",
          "priority": "u=1, i",
          "sec-ch-ua": "\"Not)A;Brand\";v=\"99\", \"Google Chrome\";v=\"127\", \"Chromium\";v=\"127\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Windows\"",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "x-cvna-appversion": "1.9.1",
          "x-cvna-browsercookieid": "327dc11a-af8c-bfd2-15b0-a4cb117a9809",
          "x-cvna-devicetype": "Desktop",
          "x-cvna-platform": "Web"
        },
        "referrer": "https://www.carvana.com/",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "include"
    });
    const data = await res.json();
    const vin = data.content.vin;
    const res2 = await fetch(`https://apik.carvana.io/stc/trades/api/v1/vehicleconfiguration/kbbvinlookup/${vin}`, {
        "headers": {
          "accept": "application/json, text/plain, */*",
          "accept-language": "en-US,en;q=0.9",
          "authorization": "Bearer",
          "priority": "u=1, i",
          "sec-ch-ua": "\"Not)A;Brand\";v=\"99\", \"Google Chrome\";v=\"127\", \"Chromium\";v=\"127\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"Windows\"",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "x-cvna-appversion": "1.9.1",
          "x-cvna-browsercookieid": "327dc11a-af8c-bfd2-15b0-a4cb117a9809",
          "x-cvna-devicetype": "Desktop",
          "x-cvna-platform": "Web"
        },
        "referrer": "https://www.carvana.com/",
        "referrerPolicy": "strict-origin-when-cross-origin",
        "body": null,
        "method": "GET",
        "mode": "cors",
        "credentials": "include"
    });
    const data2 = await res2.json();
    const vehcileInfos = data2.map((v)=>{
        return `${v.displayName} ${v.makes[0].displayName} ${v.makes[0].models[0].displayName}`;
    });
    console.log(vehcileInfos);
    console.log(vin);
})({
    license: "78AZIM",
    state: "FL"
});