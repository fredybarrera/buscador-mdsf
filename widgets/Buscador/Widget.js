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
	'dojo/Deferred',
	'dojo/_base/lang',
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
	'esri/toolbars/draw',
	'esri/geometry/projection', 
	],function (
		declare, 
		BaseWidget, 
		Deferred,
		lang,
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
		arrayUtils,
		Draw,
		projection) {

		var map, config, postRequest, getRequest, putRequest, getUnidadVecinal, showMessage, gLayer, html_infotemplate, fuente;
		
		// To create a widget, you need to derive from BaseWidget.
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
				map = this.map;
				config = this.config;
				getRequest = this.getRequest;
				putRequest = this.putRequest;
				postRequest = this.postRequest;
				getUnidadVecinal = this.getUnidadVecinal;
				showMessage = this.showMessage;
				html_infotemplate = this.getInfotemplate();
				gLayer = new GraphicsLayer({'id': 'gLayerGraphic'});

				map.addLayer(gLayer);
				var sms = new SimpleMarkerSymbol().setStyle(SimpleMarkerSymbol.STYLE_CIRCLE).setColor(new Color([255, 0, 0, 0.5]));
				let url = config.urlBaseApi + config.endPointRegiones

				getRequest(url).then(
					lang.hitch(this, function(data) { 
						let html = '<option value="-1">[Seleccione]</option>'
						arrayUtils.forEach(data, function(f) {
							html += '<option value="'+ f.t_reg_nom +'">'+ f.t_reg_nom +'</option>'
						}, this);
						$("#sel-buscador-region").html(html)
						$("#sel-buscador-region").prop('disabled', false);
					}),
					function(objErr) {
						console.log('request failed', objErr)
					}
				);	

				$('#sel-buscador-region').change(function() {
					gLayer.clear();
					let region = $(this).val();
					$("#sel-buscador-comuna").prop('disabled', true);
					$("#input-buscador-calle").prop('disabled', true).val("");
					$("#input-buscador-numero").prop('disabled', true).val("");
					$("#input-unidad-vecinal").val("");
					let url = config.urlBaseApi + config.endPointComunasRegion + region
					getRequest(url).then(
						lang.hitch(this, function(data) { 
							let html = '<option value="-1">[Seleccione]</option>'
							arrayUtils.forEach(data, function(f) {
								html += '<option value="'+ f.t_com_nom +'">'+ f.t_com_nom +'</option>'
							}, this);
							$("#sel-buscador-comuna").html(html)
							$("#sel-buscador-comuna").prop('disabled', false);
						}),
						function(objErr) {
							console.log('request failed', objErr)
						}
					);
				});

				$('#sel-buscador-comuna').change(function() {
					
					let comuna = $(this).val();
					$("#input-buscador-calle").prop('disabled', true).val("");
					$("#input-buscador-numero").prop('disabled', true).val("");
					$("#input-unidad-vecinal").val("");
					
					if(comuna !== '-1')
					{
						let url = config.urlBaseApi + config.endPointCalles + comuna
						let objComuna = config.centroideComunas.filter((val) => val.nombre === comuna );
						getRequest(url).then(
							lang.hitch(this, function(data) { 
								let calles = []
								arrayUtils.forEach(data, function(f) {
									if (f.stname !== null)
									{
										calles.push({label: f.stname, value: f.stname});
									}
								}, this);
								var input = document.getElementById("input-buscador-calle");
								autocomplete({
									input: input,
									minLength: 1,
									emptyMsg: "No se encontraron resultados",
									fetch: function(text, update) {
										text = text.toLowerCase();
										var suggestions = calles.filter(n => n.label.toLowerCase().startsWith(text))
										update(suggestions);
									},
									onSelect: function(item) {
										input.value = item.label;
										let calle = item.label;
										let comuna = $('#sel-buscador-comuna option:selected').val();
										let url = config.urlBaseApi + config.endPointNumeros + '?calle=' + calle + '&comuna=' + comuna
										getRequest(url).then(
											lang.hitch(this, function(data) { 
												let numeros = []
												arrayUtils.forEach(data, function(f) {
													if (f.addnum !== null)
													{
														numeros.push({label: f.addnum, value: f.addnum});
													}
												}, this);

												var input = document.getElementById("input-buscador-numero");
												autocomplete({
													input: input,
													minLength: 1,
													emptyMsg: "No se encontraron resultados",
													fetch: function(text, update) {
														text = text.toLowerCase();
														var suggestions = numeros.filter(n => n.label.toString().toLowerCase().startsWith(text))
														update(suggestions);
													},
													onSelect: function(item) {
														var gLayer = map.getLayer("gLayerGraphic");
														gLayer.clear();
														input.value = item.label;
														let numero = item.label;
														let url = config.urlBaseApi + config.endPointData + '?numero=' + numero + '&calle=' + calle + '&comuna=' + comuna

														// Voy a buscar la ubicación de la direccion al banco de direcciones del MDSF
														getRequest(url).then(
															lang.hitch(this, function(response) { 
																// Si la dirección tiene x,y dentro del maestro, muestro el punto en el mapa
																// if (false)
																if (response.length > 0 && response[0].displayx_d != "" && response[0].displayy_d != "")
																{
																	var data = response[0]
																	let x = data.displayx_d.replace(",", ".");
																	let y = data.displayy_d.replace(",", ".");
																	point = new Point(parseFloat(x), parseFloat(y));

																	var attr = {
																		"lat": y,
																		"lon": x,
																		"region": data.t_reg_nom,
																		"provincia": data.t_prov_nom,
																		"comuna": data.t_com_nom,
																		"direccion": data.dir_normalizada,
																		"unidad_vecinal": data.t_uv_nom
																	};
																	let strDireccion = (data.dir_normalizada)?data.dir_normalizada:'';
																	$("#input-unidad-direccion-normalizada").val(strDireccion);

																	$("#input-unidad-vecinal").val(data.t_uv_nom);
																	var infoTemplate = new InfoTemplate("Dirección", html_infotemplate);
																	var graphic = new Graphic(point, sms, attr, infoTemplate);
																	gLayer.add(graphic);
																	map.centerAndZoom(point, 15);
											
																}else{
																	// Si la direccion no tiene x,y dentro del banco de direcciones, utilizo la api de here
																	let params = {
																		'apikey': config.apiKey,
																		'housenumber': numero,
																		// 'street': 'asssssssssssss',
																		'street': calle,
																		'city': comuna,
																		'country': 'chl'
																	};
													
																	let query = Object.keys(params)
																		.map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
																		.join('&');
													
																	let url = config.urlGeocoder + '?' + query;

																	getRequest(url).then(
																		lang.hitch(this, function(data) { 
																			if (data.Response.View.length > 0) {
																				var point;
																				var label = data.Response.View[0].Result[0].Location.Address.Label;
																				var region_here = data.Response.View[0].Result[0].Location.Address.State;
																				var provincia_here = data.Response.View[0].Result[0].Location.Address.County;
																				var comuna_here = data.Response.View[0].Result[0].Location.Address.City;
														
																				$("#input-unidad-direccion-normalizada").val(label);
																				var lat = data.Response.View[0].Result[0].Location.DisplayPosition.Latitude;
																				var lon = data.Response.View[0].Result[0].Location.DisplayPosition.Longitude;	
																				point = new Point(lon, lat);

																				//Actualizo el x,y de la direccion en el banco de direcciones.
																				let params = {
																					"comuna": comuna,
																					"calle": calle,
																					"numero": numero,
																					"x": lon,
																					"y": lat,
																					"fuente": "HERE"
																				};
																	
																				let query = Object.keys(params)
																				.map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
																				.join('&');
																		
																				let url = config.urlBaseApi + config.endPointData + '?' + query;

																				putRequest(url).then(
																					lang.hitch(this, function(data) { 
																						console.log('response putRequest: ', data);
																					}),
																					function(objErr) {
																						console.log('request failed', objErr)
																					}
																				);

																				getUnidadVecinal(config.urlUnidadVecinal, point).then(
																					lang.hitch(this, function(response) { 
																						feature = response.featureSet.features[0].attributes
																						var attr = {
																							"lat": lat,
																							"lon": lon,
																							'direccion': label,
																							"region": region_here,
																							"provincia": provincia_here,
																							"comuna": comuna_here,
																							"unidad_vecinal": feature['t_uv_nom']
																						};
																						$("#input-unidad-vecinal").val(feature['t_uv_nom'])
																						var infoTemplate = new InfoTemplate("Dirección", html_infotemplate);
																						var graphic = new Graphic(point, sms, attr, infoTemplate);
																						gLayer.add(graphic);
																						map.centerAndZoom(point, 15);
																					}),
																					function(objErr) {
																						console.log('request failed', objErr)
																					}
																				);

																			}else{

																				let mensaje = `
																					<li style="color: red; margin-bottom: 20px;">
																					No hemos podido encontrar tu dirección, por favor ingresa la ubicación en el mapa y luego presiona el botón "Guardar"
																					</li>`;

																				$("#buscador-manual-uv").html('');
																				$("#buscador-manual-direccion-normalizada").html('');

																				$("#div-buscador-loading").hide();
																				$("#txt-direccion").html(mensaje);
																				$("#tr-buscador-ingresar-punto").show();
																				$("#btn-buscador-manual-guardar").show();

																				$("#div-ingreso-manual").show();
																				$("#div-ingreso-normal").hide();
																				$("#div-buscar-direccion-here").hide();
																				let region = $('#sel-buscador-region option:selected').val();
																				let comuna = $('#sel-buscador-comuna option:selected').val();
																				let srtRegion = (region !== "-1")?region:'';
																				let srtComuna = (comuna !== "-1")?comuna:'';
																				$("#buscador-manual-region").html('Región: <b>' + srtRegion + '</b>');
																				$("#buscador-manual-comuna").html('Comuna: <b>' + srtComuna + '</b>');

																				let calle = $("#input-buscador-calle").val();
																				let numero = $("#input-buscador-numero").val();

																				$("#input-calle-ingreso-manual").val(calle);
																				$("#input-numero-ingreso-manual").val(numero);

																				$("#chk-sin-direccion").prop('checked', true);
																			}
																		}),
																		function(objErr) {
																			console.log('request failed', objErr)
																		}
																	);
																}
															}),
															function(objErr) {
																console.log('request failed', objErr)
															}
														);
													}
												});
											}),
											function(objErr) {
												console.log('request failed', objErr)
											}
										);
									}
								});

								$("#input-buscador-calle").prop('disabled', false);
								$("#input-buscador-numero").prop('disabled', false);

								point = new Point(parseFloat(objComuna[0].longitud), parseFloat(objComuna[0].latitud));
								map.centerAndZoom(point, 12);
							}),
							function(objErr) {
								console.log('request failed', objErr)
							}
						);
					}
				});

				$("#chk-sin-direccion").on("click", function(){
					$("#txt-direccion").html('');
					if($(this).is(':checked'))
					{
						$("#div-ingreso-manual").show();
						$("#div-ingreso-normal").hide();
						$("#div-buscar-direccion-here").hide();
						let region = $('#sel-buscador-region option:selected').val();
						let comuna = $('#sel-buscador-comuna option:selected').val();
						let srtRegion = (region !== "-1")?region:'';
						let srtComuna = (comuna !== "-1")?comuna:'';
						$("#buscador-manual-region").html('Región: <b>' + srtRegion + '</b>');
						$("#buscador-manual-comuna").html('Comuna: <b>' + srtComuna + '</b>');

						let calle = $("#input-buscador-calle").val();
						let numero = $("#input-buscador-numero").val();

						$("#input-calle-ingreso-manual").val(calle);
						$("#input-numero-ingreso-manual").val(numero);

					} else {
						$("#div-ingreso-manual").hide();
						$("#div-ingreso-normal").show();
						$("#div-buscar-direccion-here").show();
					}
				});
			},

			getUnidadVecinal: function (url, point) {
				try{
					var deferred = new Deferred();
					var queryTask = new QueryTask(url);
					var query = new Query();
					query.spatialRelationship  = Query.SPATIAL_REL_INTERSECTS;
					query.outFields = ["*"];
					query.geometry = point
					query.returnGeometry = true;
					queryTask.execute(query);
					queryTask.on("complete", function(response){
						deferred.resolve(response);
					});
					queryTask.on("error", function(error){
						console.log('error: ', error)
						deferred.reject();
					});
				} catch(err) {
				  	console.log('request failed', err)
					deferred.reject();
				}
				return deferred.promise;
			},

			getRequest: function (url) {
				try{
				  	var deferred = new Deferred();
				  	fetch(url)
					.then(data => data.text())
					.then((text) => {
						var aux = JSON.parse(text);
						if (typeof aux === 'string')
						{
							var data = JSON.parse(aux);
							deferred.resolve(data);
						} else {
							deferred.resolve(aux);
						}
					}).catch(function (error) {
					  	console.log('request failed', error)
					  	deferred.reject();
					});
				} catch(err) {
				  	console.log('request failed', err)
					deferred.reject();
				}
				return deferred.promise;
			},
		  
			postRequest: function (url, data) {
				try{
				  	var deferred = new Deferred();
				  	let formData = new FormData();
				  	formData.append('f', 'json');
					formData.append('adds', data);
					  
					let headers = new Headers()
					headers.append("Content-Type", "application/json");
		  
				  	let fetchData = {
					  	method: 'POST',
					  	body: JSON.stringify(data),
					  	headers: headers,
						redirect: 'follow'
					}
					  
				  	fetch(url, fetchData)
					.then(data => data.text())
					.then((text) => {
						var aux = JSON.parse(text);
						var data = JSON.parse(aux);
					  	deferred.resolve(data);
		  
					}).catch(function (error) {
					  	console.log('request failed', error)
					  	deferred.reject();
					});
				} catch(err) {
					console.log('request failed', err)
					deferred.reject();
				}
				return deferred.promise;
			},

			putRequest: function (url) {
				try{
				  	var deferred = new Deferred();
		  
				  	let fetchData = {
					  	method: 'PUT'
					}
					  
				  	fetch(url, fetchData)
					.then(data => data.text())
					.then((text) => {
						var aux = JSON.parse(text);
						var data = JSON.parse(aux);
					  	deferred.resolve(data);
		  
					}).catch(function (error) {
					  	console.log('request failed', error)
					  	deferred.reject();
					});
				} catch(err) {
					console.log('request failed', err)
					deferred.reject();
				}
				return deferred.promise;
			},

			_onclickBuscarManual: function (){

				if (!projection.isSupported()) {
					console.error("projection is not supported");
					showMessage('Hprojection is not supported.')
					return;
				}

				gLayer.clear();

				$("#txt-direccion").html('');
				$("#btn-buscador-manual-guardar").hide();

				let calle = $('#input-calle-ingreso-manual').val();
				let numero = $('#input-numero-ingreso-manual').val();
				let comuna = $('#sel-buscador-comuna option:selected').val();
				
				if(calle.trim() !== "" && comuna !== '-1')
				{
					$("#div-buscador-loading").show();

					let params = {
						'apikey': config.apiKey,
						'housenumber': numero,
						// 'street': 'asssssssssssss',
						'street': calle,
						'city': comuna,
						'country': 'chl'
					};
	
					let query = Object.keys(params)
						.map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
						.join('&');
	
					let url = config.urlGeocoder + '?' + query;

					getRequest(url).then(
						lang.hitch(this, function(data) { 
							if (data.Response.View.length > 0) {
								fuente = 'HERE';
								var point;
								var label = data.Response.View[0].Result[0].Location.Address.Label;
								var region_here = data.Response.View[0].Result[0].Location.Address.State;
								var provincia_here = data.Response.View[0].Result[0].Location.Address.County;
								var comuna_here = data.Response.View[0].Result[0].Location.Address.City;
		
								var lat = data.Response.View[0].Result[0].Location.DisplayPosition.Latitude;
								var lon = data.Response.View[0].Result[0].Location.DisplayPosition.Longitude;	
								point = new Point(lon, lat);
								var sms = new SimpleMarkerSymbol().setStyle(SimpleMarkerSymbol.STYLE_CIRCLE).setColor(new Color([255, 0, 0, 0.5]));

								getUnidadVecinal(config.urlUnidadVecinal, point).then(
									lang.hitch(this, function(response) { 
										if(response.featureSet.features.length > 0) 
										{
											feature = response.featureSet.features[0].attributes

											var attr = {
												"lat": lat,
												"lon": lon,
												'direccion': label,
												"region": region_here,
												"provincia": provincia_here,
												"comuna": comuna_here,
												"unidad_vecinal": feature['t_uv_nom']
											};
	
											var infoTemplate = new InfoTemplate("Dirección", html_infotemplate);
											var graphic = new Graphic(point, sms, attr, infoTemplate);
											gLayer.add(graphic);
											map.centerAndZoom(point, 15);

											$("#buscador-manual-uv").html('Unidad vecinal: <b>' + feature.t_uv_nom + '</b>');
											$("#buscador-manual-direccion-normalizada").html('Dirección normalizada: <b>' + label + '</b>');
											$("#buscador-manual-region").html('Región: <b>' + feature.t_reg_nom + '</b>');
											$("#buscador-manual-comuna").html('Comuna: <b>' + feature.t_com_nom + '</b>');

											$("#btn-buscador-manual-guardar").show();
											$("#div-buscador-loading").hide();
											
										}else {
											$("#div-buscador-loading").hide();
											$("#btn-buscador-manual-buscar").show();
											showMessage('No se ha podido identificar la unidad vecinal, intente ubicar el punto en otro lugar.')
										}
									}),
									function(objErr) {
										console.log('request failed', objErr)
									}
								);

							}else{
								// No se encontró la dirección.
								let mensaje = `
									<li style="color: red; margin-bottom: 20px;">
									No hemos podido encontrar tu dirección, por favor ingresa la ubicación en el mapa y luego presiona el botón "Guardar"
									</li>`;

								$("#buscador-manual-uv").html('');
								$("#buscador-manual-direccion-normalizada").html('');

								$("#div-buscador-loading").hide();
								$("#txt-direccion").html(mensaje);
								$("#tr-buscador-ingresar-punto").show();
								$("#btn-buscador-manual-guardar").show();
								fuente = 'WEB';
							}
						}),
						function(objErr) {
							console.log('request failed', objErr)
						}
					);

				}else{
					showMessage('Debe ingresar un nombre de calle y seleccionar una comuna.')
				}
			},

			_onclickGuardar: function (){

				if (!projection.isSupported()) {
					console.error("projection is not supported");
					showMessage('Hprojection is not supported.')
					return;
				}
			
				let str_calle = $('#input-calle-ingreso-manual').val();
				let str_numero = $('#input-numero-ingreso-manual').val();

				if(str_calle.trim() !== "")
				{
					if (gLayer.graphics.length > 0)
					{
						$("#div-buscador-loading").show();
						$("#btn-buscador-manual-guardar").hide();

						pt = gLayer.graphics[0];
						point_aux = new Point(pt.geometry);
						var outSpatialReferenceGeo = new SpatialReference({wkid: 4326});
						
						projection.load().then(function () {
							var point = projection.project(point_aux, outSpatialReferenceGeo);

							let displayx_d = point.x
							let displayy_d = point.y

							getUnidadVecinal(config.urlUnidadVecinal, point).then(
								lang.hitch(this, function(response) { 
									if(response.featureSet.features.length > 0) 
									{
										feature = response.featureSet.features[0].attributes
										let data = {
											"Displayx_d": displayx_d,
											"Displayy_d": displayy_d,
											"T_reg_nom": feature.t_reg_nom,
											"T_prov_nom": feature.t_prov_nom,
											"T_com_nom": feature.t_com_nom,
											"T_id_uv_ca": feature.t_id_uv_ca,
											"T_uv_nom": feature.t_uv_nom,
											"T_reg_ca": feature.t_reg_ca,
											"T_prov_ca": feature.t_prov_ca,
											"T_com": feature.t_com,
											"Uv_carto": feature.uv_carto,
											"Addnum": str_numero,
											"Stname": str_calle.trim().toUpperCase(),
											"Fuente": fuente,
										}

										let url = config.urlBaseApi + config.endPointData

										postRequest(url, data).then(
											lang.hitch(this, function(objRes) { 
												$("#div-buscador-loading").hide();
												$("#btn-buscador-manual-guardar").hide();
												$("#btn-buscador-manual-buscar").show();

												$("#buscador-manual-uv").html('');
												$("#buscador-manual-direccion-normalizada").html('');

												$("#txt-direccion").html('');
												$("#tr-buscador-ingresar-punto").hide();

												gLayer.clear();
												showMessage(objRes.mensaje);
											}),
											function(objErr) {
												console.log('request failed', objErr)
												$("#div-buscador-loading").hide();
												$("#btn-buscador-manual-guardar").show();
												showMessage('Hubo un error al intentar guardar el registro, favor intentar nuevamente.')
											}
										)
										
									}else {
										$("#div-buscador-loading").hide();
										$("#btn-buscador-manual-guardar").show();
										showMessage('No se ha podido identificar la unidad vecinal, intente ubicar el punto en otro lugar.')
									}
								}),
								function(objErr) {
									console.log('request failed', objErr)
									$("#div-buscador-loading").hide();
									$("#btn-buscador-manual-guardar").show();
									showMessage('Ha ocurrido un error al intentar obtener la unidad vecinal de la dirección, favor intentar nuevamente.')
								}
							);
						});

					}else{
						showMessage('Debe ingresar la ubicación en el mapa.')
					}

				}else{
					showMessage('Debe ingresar un nombre de calle.')
				}
			},

			getInfotemplate: function () {
				var html_infotemplate = '<table class="table table-sm table-bordered"><tbody>'
				html_infotemplate += '<tr><td><b>Región: </b></td>';
				html_infotemplate += '<td>${region}</td></tr>';
				html_infotemplate += '<tr><td><b>Provincia: </b></td>';
				html_infotemplate += '<td>${provincia}</td></tr>';
				html_infotemplate += '<tr><td><b>Comuna: </b></td>';
				html_infotemplate += '<td>${comuna}</td></tr>';
				html_infotemplate += '<tr><td><b>Unidad vecinal: </b></td>';
				html_infotemplate += '<td>${unidad_vecinal}</td></tr>';
				html_infotemplate += '<tr><td><b>Dirección: </b></td>';
				html_infotemplate += '<td>${direccion}</td></tr>';
				html_infotemplate += '<tr><td><b>Latitud: </b></td>';
				html_infotemplate += '<td>${lat}</td></tr>';
				html_infotemplate += '<tr><td><b>Longitud: </b></td>';
				html_infotemplate += '<td>${lon}</td></tr>';
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

			_onclickDraw: function () {
				// var gLayer = this.map.getLayer("gLayerGraphic");
				gLayer.clear();
				$("#btn-draw").addClass('active');
				this.map.disableMapNavigation();
				tb = new Draw(this.map);
				tb.activate("point");
				tb.on("draw-end", dojo.hitch(null, this.addGraphic, tb));
			},

			addGraphic: function (tb, evt) {
				var sms = new SimpleMarkerSymbol().setStyle(SimpleMarkerSymbol.STYLE_CIRCLE).setColor(new Color([255, 0, 0, 0.5]));
				// var gLayer = this.map.getLayer("gLayerGraphic");
				var graphic = new Graphic(evt.geometry, sms);
				$("#hidden-latitud").val(evt.geometry.y)
				$("#hidden-longitud").val(evt.geometry.x)
				gLayer.add(graphic);
				$("#btn-draw").removeClass('active');
				tb.deactivate();
				this.map.enableMapNavigation();
			},

			onOpen: function () {
				console.log('onOpen');
			},

			onClose: function () {
				console.log('onClose');
				$("#txt-direccion").html('');

				$("#sel-buscador-region").val("-1").change();
				
				$("#input-unidad-direccion-normalizada").val('');
				$("#input-unidad-vecinal").val('');
				
				$("#calle").val('');
				$("#numero").val('');
				$("#comuna").val('');

				gLayer.clear();

				$("#div-ingreso-normal").show();
				$("#div-ingreso-manual").hide();
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