"use strict";

const fetch = require('node-fetch');

module.exports.main = autoscale;

function autoscale(event, context, callback) {
  console.log('testing', event)
let shipment = event.shipment,
      environment = event.environment,
      buildToken = event.buildToken,
      baseUrl = `http://shipit.services.dmtio.net/v1/shipment/${shipment}/environment/${environment}`;
  
  console.log('Fetching => ', baseUrl);
  fetch(baseUrl)
      .then((res) => res.json(), errorFunction)
      .then((data) => { 
          if (data.providers) {
              data.providers.forEach((provider) => {
                  provider.replicas = provider.replicas + 1; 
                  console.log('set provider', provider.name, provider.replicas)
                  provider.buildToken = buildToken; 
              });
          }
          
          return data.providers || [];
      }, errorFunction)
      .then((providers) => {
          let promises = [];
          providers.forEach((provider) => {
              promises.push(scaleProvider(provider, baseUrl));
          });
          return Promise.all(promises);
      }, errorFunction)
      .then((providers) => {
          providers.forEach((provider) => {
              console.log('Scaling Provider => ', provider);
          });
      })
      .catch(errorFunction)
      
      function errorFunction(error) {
          callback(error);
      }
}

function scaleProvider(provider, baseUrl) {
    let url  = `${baseUrl}/provider/${provider.name}`,
        headers = {
          'Content-Type': 'application/json',
          'x-username': 'harbor-autoscaler',
          'x-password': ''
      };
    
        
    return fetch(url, { method: 'PUT', body: JSON.stringify(provider), headers: headers })
        .then((res) => {
            let data = res.json();
            console.log('Scaled Shipment => ', data);
            return data;
        }, (error) => {
            console.log('Error Scaling Shipment => ', error);
        })
}
