///////////////////////////////////////////////////////////////////////////
// Copyright © Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////
define([
	'dojo/_base/declare', 
	'jimu/BaseWidget', 
	'esri/SpatialReference', 
	'esri/geometry/Point', 
	'esri/graphic', 
	'esri/symbols/SimpleMarkerSymbol',
	'esri/Color', 
	'esri/InfoTemplate', 
	'esri/geometry/projection', 
	'esri/geometry/coordinateFormatter', 
	'jimu/dijit/Message',
	'libs/jquery/jquery',
	'libs/autocomplete/autocomplete',
	'esri/layers/GraphicsLayer'
	],function (
		declare, 
		BaseWidget, 
		SpatialReference, 
		Point, 
		Graphic, 
		SimpleMarkerSymbol, 
		Color, 
		InfoTemplate, 
		projection, 
		coordinateFormatter,
		Message,
		jquery,
		autocomplete,
		GraphicsLayer) {

		//To create a widget, you need to derive from BaseWidget.
		return declare([BaseWidget], {
			// DemoWidget code goes here

			//please note that this property is be set by the framework when widget is loaded.
			//templateString: template,
			name: "Buscador",
			baseClass: 'jimu-widget-report',
			
			postCreate: function () {
				this.inherited(arguments);
				console.log('postCreate');
			},
			
			startup: function () {
				this.inherited(arguments);
				console.log('startup');
				var gLayer = new GraphicsLayer({'id': 'gLayerDirecciones'});
				this.map.addLayer(gLayer);
				var allowedChars = new RegExp(/^[a-zA-Z\s]+$/)

				function charsAllowed(value) {
					return allowedChars.test(value);
				}

				autocomplete({
					input: document.getElementById('calle'),
					minLength: 3,
					onSelect: function (item, inputfield) {
						inputfield.value = item.label
					},
					fetch: function (text, callback) {
						var calle = text.toLowerCase();
						let comuna = document.getElementById('comuna').value;
						var params = {
							"query": comuna + ',' + calle,
							'apikey': this.config.apiKey,
							'country': 'CHL',
							'maxresults': 30,
						};

						var query = Object.keys(params)
							.map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
							.join('&');

						var url = this.config.urlAutocomplete + '?' + query;

						fetch(url)
							.then(data => data.text())
							.then((text) => {
								var data = JSON.parse(text);
								console.log('suggestions: ', data.suggestions);
								var streets = data.suggestions.filter(obj => obj.matchLevel == 'street')
								console.log('streets: ', streets);
								callback(
									streets.map(function (elem) {
										return {
											label: elem.address.street + ', ' + elem.address.city
										}
									})
								);
							}).catch(function (error) {
								console.log('request failed', error)
							});
					},
					render: function (item, value) {
						var itemElement = document.createElement("div");
						if (charsAllowed(value)) {
							var regex = new RegExp(value, 'gi');
							var inner = item.label.replace(regex, function (match) { return "<strong>" + match + "</strong>" });
							itemElement.innerHTML = inner;
						} else {
							itemElement.textContent = item.label;
						}
						return itemElement;
					},
					emptyMsg: "No records found",
					customize: function (input, inputRect, container, maxHeight) {
						if (maxHeight < 100) {
							container.style.top = "";
							container.style.bottom = (window.innerHeight - inputRect.bottom + input.offsetHeight) + "px";
							container.style.maxHeight = "140px";
						}
					}
				});
				document.querySelector("input").focus();
			},

			showMessage: function (msg, type) {
				var class_icon = "message-info-icon";
				switch (type) {
					case "error":
						class_icon = "message-error-icon";
						break;
					case "warning":
						class_icon = "message-warning-icon";
						break;
				}
				var content = '<i class="' + class_icon + '">&nbsp;</i>' + msg;
				new Message({
					message: content
				});
			},

			_onBtnGo: function (){

				$("#txt-direccion").html('');

				let calle = document.getElementById('calle').value;
				var str_calle = calle.split(", ");
				let numero = document.getElementById('numero').value;
				let comuna = document.getElementById('comuna').value;
				
				let params = {
					'apikey': this.config.apiKey,
					'housenumber': numero.trim(),
					'street': str_calle[0].trim(),
					'city': comuna.trim(),
					'country': 'chl'
				};

				let query = Object.keys(params)
					.map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
					.join('&');

				let url = this.config.urlGeocoder + '?' + query;

				fetch(url)
					.then(data => data.text())
					.then((text) => {
						var data = JSON.parse(text);
						console.log('dataaaaaaaaaaaa: ', data);
						var point;
						var gLayer = this.map.getLayer("gLayerDirecciones");
						var sms = new SimpleMarkerSymbol().setStyle(SimpleMarkerSymbol.STYLE_CIRCLE).setColor(new Color([255, 0, 0, 0.5]));
						var label = data.Response.View[0].Result[0].Location.Address.Label;

						$("#txt-direccion").append('<li>' + label + '</li>')
						var lat = data.Response.View[0].Result[0].Location.DisplayPosition.Latitude;
						var lon = data.Response.View[0].Result[0].Location.DisplayPosition.Longitude;
						var attr = {
							"lat": lat,
							"lon": lon,
							'direccion': label
						};
						point = new Point(lon, lat);
						var html_infotemplate = '<table cellspacing="0" cellpadding="0" style="border: none;"><tbody>'
						html_infotemplate += '<tr><td><b>Latitud: </b></td>';
						html_infotemplate += '<td>${lat}</td></tr>';
						html_infotemplate += '<tr><td><b>Longitud: </b></td>';
						html_infotemplate += '<td>${lon}</td></tr>';
						html_infotemplate += '<tr><td><b>Dirección: </b></td>';
						html_infotemplate += '<td>${direccion}</td></tr>';
						html_infotemplate += '</tbody></table>';
						var infoTemplate = new InfoTemplate("Coordenadas", html_infotemplate);
						var graphic = new Graphic(point, sms, attr, infoTemplate);
						gLayer.add(graphic);

						
						this.map.centerAndZoom(point, 15);

					}).catch(function (error) {
						console.log('request failed', error)
					});
			},

			onOpen: function () {
				console.log('onOpen');
			},

			onClose: function () {
				console.log('onClose');
				$("#txt-direccion").html('');
				$("#calle").val('');
				$("#numero").val('');
				$("#comuna").val('');
				var gLayer = this.map.getLayer("gLayerDirecciones");
				gLayer.clear();
			},

			onMinimize: function () {
				console.log('onMinimize');
			},

			onMaximize: function () {
				console.log('onMaximize');
			},

			onSignIn: function (credential) {
				console.log('onSignIn');
			},

			onSignOut: function () {
				console.log('onSignOut');
			}
		});
	});