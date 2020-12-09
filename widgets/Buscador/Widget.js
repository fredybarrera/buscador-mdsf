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
	'esri/layers/GraphicsLayer',
	'esri/tasks/GeometryService',
	'esri/tasks/query',
	'esri/tasks/QueryTask',
	'dojo/_base/array',
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
		GraphicsLayer,
		GeometryService,
		Query,
		QueryTask,
		arrayUtils) {

		//To create a widget, you need to derive from BaseWidget.
		return declare([BaseWidget], {
			// DemoWidget code goes here

			//please note that this property is be set by the framework when widget is loaded.
			//templateString: template,
			name: "Buscador",
			baseClass: 'jimu-widget-buscador',
			
			postCreate: function () {
				this.inherited(arguments);
				console.log('postCreate');
			},
			
			startup: function () {
				this.inherited(arguments);
				var gLayer = new GraphicsLayer({'id': 'gLayerDirecciones'});
				var map = this.map;
				map.addLayer(gLayer);
				var allowedChars = new RegExp(/^[a-zA-Z\s]+$/)
				var config = this.config
				var html_infotemplate = this.getInfotemplate()
				let url = config.urlBaseApi + config.endPointRegiones

				fetch(url)
				.then(data => data.text())
				.then((text) => {
					var aux = JSON.parse(text);
					var data = JSON.parse(aux);
					console.log('data: ', data);
					let html = '<option value="-1">[Seleccione]</option>'
					arrayUtils.forEach(data, function(f) {
						html += '<option value="'+ f.lregio +'">'+ f.lregio +'</option>'
					}, this);
					$("#sel-buscador-region").html(html)
				}).catch(function (error) {
					console.log('request failed', error)
				});

				$('#sel-buscador-region').change(function() {

					let region = $(this).val();
					let url = config.urlBaseApi + config.endPointProvincias + region

					fetch(url)
					.then(data => data.text())
					.then((text) => {
						var aux = JSON.parse(text);
						var data = JSON.parse(aux);
						console.log('data: ', data);
						let html = '<option value="-1">[Seleccione]</option>'
						arrayUtils.forEach(data, function(f) {
							html += '<option value="'+ f.lprovi +'">'+ f.lprovi +'</option>'
						}, this);
						$("#sel-buscador-provincia").html(html)
					}).catch(function (error) {
						console.log('request failed', error)
					});
				});

				$('#sel-buscador-provincia').change(function() {

					let provincia = $(this).val();
					let url = config.urlBaseApi + config.endPointComunas + provincia

					fetch(url)
					.then(data => data.text())
					.then((text) => {
						var aux = JSON.parse(text);
						var data = JSON.parse(aux);
						console.log('data: ', data);
						let html = '<option value="-1">[Seleccione]</option>'
						arrayUtils.forEach(data, function(f) {
							html += '<option value="'+ f.lmunic +'">'+ f.lmunic +'</option>'
						}, this);
						$("#sel-buscador-comuna").html(html)
					}).catch(function (error) {
						console.log('request failed', error)
					});
				});

				$('#sel-buscador-comuna').change(function() {

					let comuna = $(this).val();
					let url = config.urlBaseApi + config.endPointCalles + comuna

					fetch(url)
					.then(data => data.text())
					.then((text) => {
						var aux = JSON.parse(text);
						var data = JSON.parse(aux);
						console.log('data: ', data);
						let html = '<option value="-1">[Seleccione]</option>'
						arrayUtils.forEach(data, function(f) {
							html += '<option value="'+ f.stname +'">'+ f.stname +'</option>'
						}, this);
						$("#sel-buscador-calle").html(html)
					}).catch(function (error) {
						console.log('request failed', error)
					});
				});

				$('#sel-buscador-calle').change(function() {

					let calle = $(this).val();
					let comuna = $('#sel-buscador-comuna option:selected').val()
					let url = config.urlBaseApi + config.endPointNumeros + '?calle=' + calle + '&comuna=' + comuna

					fetch(url)
					.then(data => data.text())
					.then((text) => {
						var aux = JSON.parse(text);
						var data = JSON.parse(aux);
						console.log('data: ', data);
						let html = '<option value="-1">[Seleccione]</option>'
						arrayUtils.forEach(data, function(f) {
							html += '<option value="'+ f.addnum +'">'+ f.addnum +'</option>'
						}, this);
						$("#sel-buscador-numero").html(html)
					}).catch(function (error) {
						console.log('request failed', error)
					});
				});

				$('#sel-buscador-numero').change(function() {

					let numero = $(this).val();
					let calle = $('#sel-buscador-calle option:selected').val()
					let comuna = $('#sel-buscador-comuna option:selected').val()
					let url = config.urlBaseApi + config.endPointData + '?numero=' + numero + '&calle=' + calle + '&comuna=' + comuna

					



					// Voy a buscar la ubicación de la direccion al banco de direcciones del MDSF
					fetch(url)
					.then(data => data.text())
					.then((text) => {
						
						var aux = JSON.parse(text);
						var data = JSON.parse(aux);

						// Si la dirección tiene x,y dentro del maestro, muestro el punto en el mapa
						if (false)
						// if (data.length > 0 && data[0].x != "" && data[0].y != "")
						{
							var data = data[0]

							$("#txt-direccion").text(data.match_addr)
							let x = data.x.replace(",", ".");
							let y = data.y.replace(",", ".");
	
							console.log('data: ', data);
							console.log('x: ', x);
							console.log('y: ', y);
	
							// var gLayer = this.map.getLayer("gLayerDirecciones");
							var sms = new SimpleMarkerSymbol().setStyle(SimpleMarkerSymbol.STYLE_CIRCLE).setColor(new Color([255, 0, 0, 0.5]));
	
							var attr = {
								"lat": y,
								"lon": x,
								"region": data.lregio,
								"provincia": data.lprovi,
								"comuna": data.lmunic,
								"direccion": data.direccion_nonorma,
							};
							
							point = new Point(parseFloat(x), parseFloat(y));
							console.log('point: ', point);


							var url_layer_uv = "https://mdsfmapas.ministeriodesarrollosocial.gob.cl/arcgis/rest/services/CAPTURA_DE_DIRECCIONES/UnidadesVecinales/FeatureServer/0"
							var queryTask = new QueryTask(url_layer_uv);
							var query = new Query();
							query.spatialRelationship  = Query.SPATIAL_REL_INTERSECTS;
							query.outFields = ["*"];
							query.geometry = point
							query.returnGeometry = true;
							queryTask.execute(query);
							queryTask.on("complete", function(sss, www){
								console.log('sss: ', sss)
								console.log('www: ', www)
							});
							queryTask.on("error", function(error){
								console.log('error: ', error)

							});

							
							var infoTemplate = new InfoTemplate("Dirección", html_infotemplate);
							var graphic = new Graphic(point, sms, attr, infoTemplate);
							gLayer.add(graphic);
							map.centerAndZoom(point, 15);

						}else{
							// Si la direccion no tiene x,y dentro del banco de direcciones, utilizo la api de here
							let str_numero = $('#sel-buscador-numero option:selected').text()
							let str_calle = $('#sel-buscador-calle option:selected').text()
							let str_comuna = $('#sel-buscador-comuna option:selected').text()
							let params = {
								'apikey': config.apiKey,
								'housenumber': str_numero,
								// 'street': 'asssssssssssss',
								'street': str_calle,
								'city': str_comuna,
								'country': 'chl'
							};
			
							let query = Object.keys(params)
								.map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
								.join('&');
			
							let url = config.urlGeocoder + '?' + query;
			
							fetch(url)
								.then(data => data.text())
								.then((text) => {
									var data = JSON.parse(text);
									console.log('response api here: ', data);
									if (data.Response.View.length > 0) {
										var point;
										var sms = new SimpleMarkerSymbol().setStyle(SimpleMarkerSymbol.STYLE_CIRCLE).setColor(new Color([255, 0, 0, 0.5]));
										var label = data.Response.View[0].Result[0].Location.Address.Label;
										var region = data.Response.View[0].Result[0].Location.Address.State;
										var provincia = data.Response.View[0].Result[0].Location.Address.County;
										var comuna = data.Response.View[0].Result[0].Location.Address.City;
				
										$("#txt-direccion").append('<li>' + label + '</li>')
										var lat = data.Response.View[0].Result[0].Location.DisplayPosition.Latitude;
										var lon = data.Response.View[0].Result[0].Location.DisplayPosition.Longitude;
										
	
										point = new Point(lon, lat);

										var unidad_vecinal = "SAN VICENTE SUR"

										var url_layer_uv = "https://mdsfmapas.ministeriodesarrollosocial.gob.cl/arcgis/rest/services/CAPTURA_DE_DIRECCIONES/UnidadesVecinales/FeatureServer/0"
										var queryTask = new QueryTask(url_layer_uv);
										var query = new Query();
										query.spatialRelationship  = Query.SPATIAL_REL_INTERSECTS;
										query.outFields = ["*"];
										query.geometry = point
										query.returnGeometry = true;
										queryTask.execute(query);
										queryTask.on("complete", function(response, obj){
											console.log('response: ', response)
											feature = response.featureSet.features[0].attributes
											// unidad_vecinal = feature['t_uv_nom']
										});
										queryTask.on("error", function(error){
											console.log('error: ', error)

										});

										var attr = {
											"lat": lat,
											"lon": lon,
											'direccion': label,
											"region": region,
											"provincia": provincia,
											"comuna": comuna,
											"unidad_vecinal": unidad_vecinal
										};

										$("#txt-uv").append('<li>' + unidad_vecinal + '</li>')
										
										var infoTemplate = new InfoTemplate("Coordenadas", html_infotemplate);
										var graphic = new Graphic(point, sms, attr, infoTemplate);
										gLayer.add(graphic);
										map.centerAndZoom(point, 15);
									}else{
										// No se encontró la dirección.
										$("#txt-direccion").append('<li>No hemos podido encontrar tu dirección, por favor completa los siguiente campos e ingresa la ubicación en el mapa.</li>')
									}
			
								}).catch(function (error) {
									console.log('request failed', error)
								});
						}

						
					}).catch(function (error) {
						console.log('request failed', error)
					});
				});

				




				// function charsAllowed(value) {
				// 	return allowedChars.test(value);
				// }

				// autocomplete({
				// 	input: document.getElementById('calle'),
				// 	minLength: 3,
				// 	onSelect: function (item, inputfield) {
				// 		inputfield.value = item.label
				// 	},
				// 	fetch: function (text, callback) {
				// 		var calle = text.toLowerCase();
				// 		let comuna = document.getElementById('comuna').value;
				// 		var params = {
				// 			"query": comuna + ',' + calle,
				// 			'apikey': config.apiKey,
				// 			'country': 'CHL',
				// 			'maxresults': 30,
				// 		};

				// 		var query = Object.keys(params)
				// 			.map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
				// 			.join('&');

				// 		var url = config.urlAutocomplete + '?' + query;

				// 		fetch(url)
				// 			.then(data => data.text())
				// 			.then((text) => {
				// 				var data = JSON.parse(text);
				// 				console.log('suggestions: ', data.suggestions);
				// 				var streets = data.suggestions.filter(obj => obj.matchLevel == 'street')
				// 				console.log('streets: ', streets);
				// 				callback(
				// 					streets.map(function (elem) {
				// 						return {
				// 							label: elem.address.street + ', ' + elem.address.city
				// 						}
				// 					})
				// 				);
				// 			}).catch(function (error) {
				// 				console.log('request failed', error)
				// 			});
				// 	},
				// 	render: function (item, value) {
				// 		var itemElement = document.createElement("div");
				// 		if (charsAllowed(value)) {
				// 			var regex = new RegExp(value, 'gi');
				// 			var inner = item.label.replace(regex, function (match) { return "<strong>" + match + "</strong>" });
				// 			itemElement.innerHTML = inner;
				// 		} else {
				// 			itemElement.textContent = item.label;
				// 		}
				// 		return itemElement;
				// 	},
				// 	emptyMsg: "No records found",
				// 	customize: function (input, inputRect, container, maxHeight) {
				// 		if (maxHeight < 100) {
				// 			container.style.top = "";
				// 			container.style.bottom = (window.innerHeight - inputRect.bottom + input.offsetHeight) + "px";
				// 			container.style.maxHeight = "140px";
				// 		}
				// 	}
				// });
				// document.querySelector("input").focus();
			},


			queryTaskExecuteCompleteHandler: function() {

			},

			getInfotemplate: function () {
				var html_infotemplate = '<table cellspacing="0" cellpadding="0" style="border: none;"><tbody>'
				html_infotemplate += '<tr><td><b>Latitud: </b></td>';
				html_infotemplate += '<td>${lat}</td></tr>';
				html_infotemplate += '<tr><td><b>Longitud: </b></td>';
				html_infotemplate += '<td>${lon}</td></tr>';
				html_infotemplate += '<tr><td><b>Región: </b></td>';
				html_infotemplate += '<td>${region}</td></tr>';
				html_infotemplate += '<tr><td><b>Provincia: </b></td>';
				html_infotemplate += '<td>${provincia}</td></tr>';
				html_infotemplate += '<tr><td><b>Comuna: </b></td>';
				html_infotemplate += '<td>${comuna}</td></tr>';
				html_infotemplate += '<tr><td><b>Dirección: </b></td>';
				html_infotemplate += '<td>${direccion}</td></tr>';
				html_infotemplate += '<tr><td><b>Unidad vecinal: </b></td>';
				html_infotemplate += '<td>${unidad_vecinal}</td></tr>';
				html_infotemplate += '</tbody></table>';
				return html_infotemplate;
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