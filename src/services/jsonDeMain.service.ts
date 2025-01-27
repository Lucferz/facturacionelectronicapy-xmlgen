import * as xml2js from 'xml2js';

import stringUtilService from './StringUtil.service';
import fechaUtilService from './FechaUtil.service';
import constanteService from './Constante.service';
import jsonDteItem from './jsonDteItem.service';
import jsonDteAlgoritmos from './jsonDteAlgoritmos.service';
import jsonDteComplementarios from './jsonDteComplementario.service';
import jsonDteTransporte from './jsonDteTransporte.service';
import jsonDteTotales from './jsonDteTotales.service';
import jsonDteComplementarioComercial from './jsonDteComplementariosComerciales.service';
import jsonDteIdentificacionDocumento from './jsonDteIdentificacionDocumento.service';
import jsonDeMainValidate from './jsonDeMainValidate.service';
import { XmlgenConfig } from './type.interface.';

class JSonDeMainService {
  codigoSeguridad: any = null;
  codigoControl: any = null;
  json: any = {};
  validateError = true;

  public generateXMLDE(params: any, data: any, config?: XmlgenConfig): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        let defaultConfig: XmlgenConfig = {
          defaultValues: true,
          //arrayValuesSeparator : ', ',
          errorSeparator: '; ',
          errorLimit: 10,
          redondeoSedeco: true,
        };

        defaultConfig = Object.assign(defaultConfig, config);

        resolve(this.generateXMLDeService(params, data, defaultConfig));
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Metodo principal de generacion de XML del DE
   * @param params
   * @param data
   * @returns
   */
  private generateXMLDeService(params: any, data: any, config: XmlgenConfig) {
    this.removeUnderscoreAndPutCamelCase(data);

    this.addDefaultValues(data);

    if (this.validateError) {
      jsonDeMainValidate.validateValues({ ...params }, { ...data }, config);
    }

    this.json = {};

    this.generateCodigoControl(params, data); //Luego genera el código de Control

    this.generateRte(params);

    this.json['rDE']['DE'] = this.generateDe(params, data);
    //---
    this.generateDatosOperacion(params, data);
    this.generateDatosTimbrado(params, data);
    this.generateDatosGenerales(params, data, config);
    //---
    this.generateDatosEspecificosPorTipoDE(params, data);

    if (data['tipoDocumento'] == 1 || data['tipoDocumento'] == 4) {
      this.generateDatosCondicionOperacionDE(params, data);
    }

    //['gDtipDE']=E001
    this.json['rDE']['DE']['gDtipDE']['gCamItem'] = jsonDteItem.generateDatosItemsOperacion(params, data, config);

    this.json['rDE']['DE']['gDtipDE']['gCamEsp'] =
      jsonDteComplementarios.generateDatosComplementariosComercialesDeUsoEspecificos(params, data);

    if (data['tipoDocumento'] == 1 || data['tipoDocumento'] == 7) {
      //1 Opcional, 7 Obligatorio
      if (data['detalleTransporte']) {
        this.json['rDE']['DE']['gDtipDE']['gTransp'] = jsonDteTransporte.generateDatosTransporte(params, data);
      }
    }

    if (data['tipoDocumento'] != 7) {
      const items = this.json['rDE']['DE']['gDtipDE']['gCamItem'];
      this.json['rDE']['DE']['gTotSub'] = jsonDteTotales.generateDatosTotales(params, data, items, config);
    }

    if (data['complementarios']) {
      this.json['rDE']['DE']['gCamGen'] = jsonDteComplementarioComercial.generateDatosComercialesUsoGeneral(
        params,
        data,
      );
    }

    if (data['tipoDocumento'] == 4 || data['tipoDocumento'] == 5 || data['tipoDocumento'] == 6) {
      if (!data['documentoAsociado']) {
        /*throw new Error(
          'Documento asociado es obligatorio para el tipo de documento electrónico (' +
            data['tipoDocumento'] +
            ') seleccionado',
        );*/
      }
    }
    if (
      data['tipoDocumento'] == 1 ||
      data['tipoDocumento'] == 4 ||
      data['tipoDocumento'] == 5 ||
      data['tipoDocumento'] == 6 ||
      data['tipoDocumento'] == 7
    ) {
      //this.json['rDE']['DE']['gDtipDE']['gCamDEAsoc'] = jsonDteIdentificacionDocumento.generateDatosDocumentoAsociado(params, data);
      if (data['documentoAsociado']) {
        this.json['rDE']['DE']['gCamDEAsoc'] = jsonDteIdentificacionDocumento.generateDatosDocumentoAsociado(
          params,
          data,
        );
      }
    }
    var builder = new xml2js.Builder({
      xmldec: {
        version: '1.0',
        encoding: 'UTF-8',
        standalone: false,
      },
    });
    var xml = builder.buildObject(this.json);

    return this.normalizeXML(xml); //Para firmar tiene que estar normalizado
  }

  /**
   * Genera el CDC para la Factura
   * Corresponde al Id del DE
   *
   * @param params
   * @param data
   */
  generateCodigoControl(params: any, data: any) {
    if (data.cdc && (data.cdc + '').length == 44) {
      //Caso ya se le pase el CDC
      this.codigoSeguridad = data.cdc.substring(34, 43);
      this.codigoControl = data.cdc;

      //Como se va utilizar el CDC enviado como parametro, va a verificar que todos los datos del XML coincidan con el CDC.
      const tipoDocumentoCDC = this.codigoControl.substring(0, 2);
      //const rucCDC = this.codigoControl.substring(2, 10);
      //const dvCDC = this.codigoControl.substring(10, 11);
      const establecimientoCDC = this.codigoControl.substring(11, 14);
      const puntoCDC = this.codigoControl.substring(14, 17);
      const numeroCDC = this.codigoControl.substring(17, 24);
      //const tipoContribuyenteCDC = this.codigoControl.substring(24, 25);
      const fechaCDC = this.codigoControl.substring(25, 33);
      const tipoEmisionCDC = this.codigoControl.substring(33, 34);

      if (+data['tipoDocumento'] != +tipoDocumentoCDC) {
        /*throw new Error(
          "El Tipo de Documento '" +
            data['tipoDocumento'] +
            "' en data.tipoDocumento debe coincidir con el CDC reutilizado (" +
            +tipoDocumentoCDC +
            ')',
        );*/
      }

      const establecimiento = stringUtilService.leftZero(data['establecimiento'], 3);
      if (establecimiento != establecimientoCDC) {
        /*throw new Error(
          "El Establecimiento '" +
            establecimiento +
            "'en data.establecimiento debe coincidir con el CDC reutilizado (" +
            establecimientoCDC +
            ')',
        );*/
      }

      const punto = stringUtilService.leftZero(data['punto'], 3);
      if (punto != puntoCDC) {
        /*throw new Error(
          "El Punto '" + punto + "' en data.punto debe coincidir con el CDC reutilizado (" + puntoCDC + ')',
        );*/
      }

      const numero = stringUtilService.leftZero(data['numero'], 7);
      if (numero != numeroCDC) {
        /*throw new Error(
          "El Numero de Documento '" +
            numero +
            "'en data.numero debe coincidir con el CDC reutilizado (" +
            numeroCDC +
            ')',
        );*/
      }

      /*if (+data['tipoContribuyente'] != +tipoContribuyenteCDC) {
        //throw new Error("El Tipo de Contribuyente '" + data['tipoContribuyente'] + "' en data.tipoContribuyente debe coincidir con el CDC reutilizado (" + tipoContribuyenteCDC + ")");
      }*/
      const fecha =
        (data['fecha'] + '').substring(0, 4) +
        (data['fecha'] + '').substring(5, 7) +
        (data['fecha'] + '').substring(8, 10);
      if (fecha != fechaCDC) {
        /*throw new Error(
          "La fecha '" + fecha + "' en data.fecha debe coincidir con el CDC reutilizado (" + fechaCDC + ')',
        );*/
      }

      if (+data['tipoEmision'] != +tipoEmisionCDC) {
        /*throw new Error(
          "El Tipo de Emisión '" +
            data['tipoEmision'] +
            "' en data.tipoEmision debe coincidir con el CDC reutilizado (" +
            tipoEmisionCDC +
            ')',
        );*/
      }
    } else {
      this.codigoSeguridad = stringUtilService.leftZero(data.codigoSeguridadAleatorio, 9);
      this.codigoControl = jsonDteAlgoritmos.generateCodigoControl(params, data, this.codigoSeguridad);
    }
  }

  /**
   * Si los valores vienen en underscore, crea los valores en formato variableJava que
   * sera utilizado dentro del proceso,
   *
   * Ej. si viene tipo_documento crea una variable tipoDocumento, con el mismo valor.
   *
   * @param data
   */
  private removeUnderscoreAndPutCamelCase(data: any) {
    if (data.tipo_documento) {
      data.tipoDocumento = data.tipo_documento;
    }

    if (data.tipo_contribuyente) {
      data.tipoContribuyente = data.tipo_contribuyente;
    }

    if (data.tipo_emision) {
      data.tipoEmision = data.tipo_emision;
    }

    if (data.tipo_transaccion) {
      data.tipoTransaccion = data.tipo_transaccion;
    }

    if (data.tipo_impuesto) {
      data.tipoImpuesto = data.tipo_impuesto;
    }

    if (data.condicion_anticipo) {
      data.condicionAnticipo = data.condicion_anticipo;
    }

    if (data.condicion_tipo_cambio) {
      data.condicionTipoCambio = data.condicion_tipo_cambio;
    }

    //Objeto Cliente
    if (data.cliente?.razon_social) {
      data.cliente.razonSocial = data.cliente.razon_social;
    }
    if (data.cliente?.nombre_fantasia) {
      data.cliente.nombreFantasia = data.cliente.nombre_fantasia;
    }
    if (data.cliente?.tipo_operacion) {
      data.cliente.tipoOperacion = data.cliente.tipo_operacion;
    }

    //Campo que puede ser un numero = 0, hay que validar de esta forma
    if (typeof data.cliente != 'undefined' && typeof data.cliente.numero_casa != 'undefined') {
      data.cliente.numeroCasa = data.cliente.numero_casa + '';
    }
    if (data.cliente?.tipo_contribuyente) {
      data.cliente.tipoContribuyente = data.cliente.tipo_contribuyente;
    }
    if (data.cliente?.documento_tipo) {
      data.cliente.documentoTipo = data.cliente.documento_tipo;
    }
    if (data.cliente?.documento_numero) {
      data.cliente.documentoNumero = data.cliente.documento_numero;
    }

    //Usuario
    if (data.usuario?.documento_tipo) {
      data.usuario.documentoTipo = data.usuario.documento_tipo;
    }
    if (data.usuario?.documento_numero) {
      data.usuario.documentoNumero = data.usuario.documento_numero;
    }

    //Factura
    if (data.factura?.fecha_envio) {
      data.factura.fechaEnvio = data.usuario.fecha_envio;
    }

    //AutoFactura
    if (data.auto_factura) {
      data.autoFactura = { ...data.auto_factura };
    }

    if (data.autoFactura?.tipo_vendedor) {
      data.autoFactura.tipoVendedor = data.autoFactura.tipo_vendedor;
    }

    if (data.autoFactura?.documentoTipo) {
      data.autoFactura.documentoTipo = data.autoFactura.documentoTipo;
    }

    if (data.autoFactura?.documento_numero) {
      data.autoFactura.documentoNumero = data.autoFactura.documento_numero;
    }

    //Remision
    if (data.remision?.tipo_responsable) {
      data.remision.tipoResponsable = data.remision.tipo_resonsable;
    }

    //Condicion entregas
    if (data.condicion?.entregas && data.condicion?.entregas.length > 0) {
      for (let i = 0; i < data.condicion.entregas.length; i++) {
        const entrega = data.condicion.entregas[i];

        if (entrega.info_tarjeta) {
          entrega.infoTarjeta = { ...entrega.info_tarjeta };
        }

        if (entrega.infoTarjeta?.numero_tarjeta) {
          entrega.infoTarjeta.numeroTarjeta = entrega.infoTarjeta.numero_tarjeta;
        }

        if (entrega.infoTarjeta?.razon_social) {
          entrega.infoTarjeta.razonSocial = entrega.infoTarjeta.razon_social;
        }

        if (entrega.infoTarjeta?.medio_pago) {
          entrega.infoTarjeta.medioPago = entrega.infoTarjeta.medio_pago;
        }

        if (entrega.infoTarjeta?.codigo_autorizacion) {
          entrega.infoTarjeta.codigoAutorizacion = entrega.infoTarjeta.codigo_autorizacion;
        }

        if (entrega.info_cheque) {
          entrega.infoCheque = { ...entrega.info_cheque };
        }

        if (entrega.infoCheque?.numero_cheque) {
          entrega.infoCheque.numeroCheque = entrega.infoCheque.numero_cheque;
        }
      }
    }

    if (data.condicion?.credito && data.condicion?.credito.length > 0) {
      for (let i = 0; i < data.condicion.credito.length; i++) {
        const credito = data.condicion.credito[i];

        if (credito.monto_entrega) {
          credito.montoEntrega = credito.monto_entrega;
        }

        if (credito.info_cuotas) {
          credito.infoCuotas = { ...credito.info_cuotas };
        }
      }
    }

    //Items
    if (data.items && data.items?.length > 0) {
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];

        if (item.partida_arancelaria) {
          item.partidaArancelaria = item.partida_arancelaria;
        }
        if (item.unidad_medida) {
          item.unidadMedida = item.unidad_medida;
        }
        if (item.precio_unitario) {
          item.precioUnitario = item.precio_unitario;
        }
        if (item.descuento_porcentaje) {
          item.descuentoPorcentaje = item.descuento_porcentaje;
        }
        if (item.tolerancia_cantidad) {
          item.toleranciaCantidad = item.tolerancia_cantidad;
        }
        if (item.tolerancia_porcentaje) {
          item.toleranciaPorcentaje = item.tolerancia_porcentaje;
        }
        if (item.cdc_anticipo) {
          item.cdcAnticipo = item.cdc_anticipo;
        }

        if (item.iva_tipo) {
          item.ivaTipo = item.iva_tipo;
        }
        if (item.iva_base) {
          item.ivaBase = item.iva_base;
        }
        if (item.numero_serie) {
          item.numeroSerie = item.numero_serie;
        }
        if (item.numero_pedido) {
          item.numeroPedido = item.numero_pedido;
        }
        if (item.numero_seguimiento) {
          item.numeroSeguimiento = item.numero_seguimiento;
        }

        //DNCP
        if (item.dncp) {
          if (item.dncp.codigo_nivel_general) {
            item.dncp.codigoNivelGeneral = item.dncp.codigo_nivel_general;
          }

          if (item.dncp.codigo_nivel_especifico) {
            item.dncp.codigoNivelEspecifico = item.dncp.codigo_nivel_especifico;
          }

          if (item.dncp.codigo_gtin_producto) {
            item.dncp.codigoGtinProducto = item.dncp.codigo_gtin_producto;
          }

          if (item.dncp.codigo_nivel_paquete) {
            item.dncp.codigoNivelPaquete = item.dncp.codigo_nivel_paquete;
          }
        }

        //Importador
        if (item.importador) {
          if (item.importador.registro_importador) {
            item.importador.registroImportador = item.importador.registro_importador;
          }

          if (item.importador.registro_senave) {
            item.importador.registroSenave = item.importador.registro_senave;
          }

          if (item.importador.registro_entidad_comercial) {
            item.importador.registroEntidadComercial = item.importador.registro_entidad_comercial;
          }
        }
        //Sector Automotor
        if (item.sector_automotor) {
          if (item.sector_automotor.capacidad_motor) {
            item.sector_automotor.capacidadMotor = item.sector_automotor.capacidad_motor;
          }

          if (item.sector_automotor.capacidad_pasajeros) {
            item.sector_automotor.capacidadPasajeros = item.sector_automotor.capacidad_pasajeros;
          }

          if (item.sector_automotor.peso_bruto) {
            item.sector_automotor.pesoBruto = item.sector_automotor.peso_bruto;
          }

          if (item.sector_automotor.peso_neto) {
            item.sector_automotor.pesoNeto = item.sector_automotor.peso_neto;
          }

          if (item.sector_automotor.tipo_combustible) {
            item.sector_automotor.tipoCombustible = item.sector_automotor.tipo_combustible;
          }

          if (item.sector_automotor.numero_motor) {
            item.sector_automotor.numeroMotor = item.sector_automotor.numero_motor;
          }

          if (item.sector_automotor.capacidad_traccion) {
            item.sector_automotor.capacidadTraccion = item.sector_automotor.capacidad_traccion;
          }

          if (item.sector_automotor.tipo_vehiculo) {
            item.sector_automotor.tipoVehiculo = item.sector_automotor.tipo_vehiculo;
          }
        }
      }
    }

    //Sector Energia
    if (data.sector_energia_electrica) {
      data.sectorEnergiaElectrica = { ...data.sector_energia_electrica };
    }

    if (data.sectorEnergiaElectrica?.numero_medidor) {
      data.sectorEnergiaElectrica.numeroMedidor = data.sectorEnergiaElectrica.numero_medidor;
    }

    if (data.sectorEnergiaElectrica?.codigo_actividad) {
      data.sectorEnergiaElectrica.codigoActividad = data.sectorEnergiaElectrica.codigo_actividad;
    }

    if (data.sectorEnergiaElectrica?.codigo_categoria) {
      data.sectorEnergiaElectrica.codigoCategoria = data.sectorEnergiaElectrica.codigo_categoria;
    }

    if (data.sectorEnergiaElectrica?.lectura_anterior) {
      data.sectorEnergiaElectrica.lecturaAnterior = data.sectorEnergiaElectrica.lectura_anterior;
    }

    if (data.sectorEnergiaElectrica?.lectura_actual) {
      data.sectorEnergiaElectrica.lecturaActual = data.sectorEnergiaElectrica.lectura_actual;
    }

    //Sector Seguros
    if (data.sector_seguros) {
      data.sectorSeguros = { ...data.sector_seguros };
    }

    if (data.sectorSeguros?.codigo_aseguradora) {
      data.sectorSeguros.codigoAseguradora = data.sectorSeguros.codigo_aseguradora;
    }

    if (data.sectorSeguros?.codigo_poliza) {
      data.sectorSeguros.codigoPoliza = data.sectorSeguros.codigo_poliza;
    }

    if (data.sectorSeguros?.numero_poliza) {
      data.sectorSeguros.numeroPoliza = data.sectorSeguros.numero_poliza;
    }

    if (data.sectorSeguros?.vigencia_unidad) {
      data.sectorSeguros.vigenciaUnidad = data.sectorSeguros.vigencia_unidad;
    }

    if (data.sectorSeguros?.inicio_vigencia) {
      data.sectorSeguros.inicioVigencia = data.sectorSeguros.inicio_vigencia;
    }

    if (data.sectorSeguros?.fin_vigencia) {
      data.sectorSeguros.finVigencia = data.sectorSeguros.fin_vigencia;
    }

    if (data.sectorSeguros?.codigo_interno_item) {
      data.sectorSeguros.codigoInternoItem = data.sectorSeguros.codigo_interno_item;
    }
  }

  /**
   * Añade algunos valores por defecto al JSON de entrada, valido para
   * todas las operaciones
   * @param data
   */
  private addDefaultValues(data: any) {
    if (constanteService.tiposDocumentos.filter((um) => um.codigo === data['tipoDocumento']).length == 0) {
      //No quitar este throw
      throw (
        new Error("Tipo de Documento '" + data['tipoDocumento']) +
        "' en data.tipoDocumento no válido. Valores: " +
        constanteService.tiposDocumentos.map((a) => a.codigo + '-' + a.descripcion)
      );
    }
    data['tipoDocumentoDescripcion'] = constanteService.tiposDocumentos.filter(
      (td) => td.codigo == data['tipoDocumento'],
    )[0]['descripcion'];

    if (!data['tipoEmision']) {
      data['tipoEmision'] = 1;
    }

    if (!data['tipoTransaccion']) {
      data['tipoTransaccion'] = 1;
    }

    if (!data['moneda']) {
      data['moneda'] = 'PYG';
    }

    //Valores por defecto para los items
    if (data['items'] && data['items'].length > 0) {
      for (let i = 0; i < data['items'].length; i++) {
        const item = data['items'][i];
        if (!item['unidadMedida']) {
          item['unidadMedida'] = 77;
        }
      }
    }
  }

  private generateRte(params: any) {
    this.json = {
      rDE: {
        $: {
          xmlns: 'http://ekuatia.set.gov.py/sifen/xsd',
          'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
          'xsi:schemaLocation': 'http://ekuatia.set.gov.py/sifen/xsd siRecepDE_v150.xsd',
        },
        dVerFor: params.version,
      },
    };
  }

  private generateDe(params: any, data: any) {
    if (params['ruc'].indexOf('-') == -1) {
      //throw new Error('RUC debe contener dígito verificador en params.ruc');
    }
    const rucEmisor = params['ruc'].split('-')[0];
    const dvEmisor = params['ruc'].split('-')[1];

    if (this.validateError) {
      var reg = new RegExp(/^\d+$/);
      if (!reg.test(rucEmisor)) {
        //throw new Error("El RUC '" + rucEmisor + "' debe ser numérico");
      }
      if (!reg.test(dvEmisor)) {
        //throw new Error("El DV del RUC '" + dvEmisor + "' debe ser numérico");
      }
    }
    const id = this.codigoControl;

    const fechaFirmaDigital = new Date(params.fechaFirmaDigital);

    let digitoVerificadorString = this.codigoControl + '';

    const jsonResult = {
      $: {
        Id: id,
      },
      dDVId: digitoVerificadorString.substring(digitoVerificadorString.length - 1, digitoVerificadorString.length),
      dFecFirma: fechaUtilService.convertToJSONFormat(new Date()),
      dSisFact: 1,
    };

    return jsonResult;
  }

  /**
     * Datos inerentes a la operacion 
     * <gOpeDE>
            <iTipEmi>1</iTipEmi>
            <dDesTipEmi>Normal</dDesTipEmi>
            <dCodSeg>000000023</dCodSeg>
            <dInfoEmi>1</dInfoEmi>
            <dInfoFisc>Información de interés del Fisco respecto al DE</dInfoFisc>
        </gOpeDE>

     * @param params 
     * @param data 
     * @param options 
     */
  private generateDatosOperacion(params: any, data: any) {
    if (params['ruc'].indexOf('-') == -1) {
      //throw new Error('RUC debe contener dígito verificador en params.ruc');
    }
    const rucEmisor = params['ruc'].split('-')[0];
    const dvEmisor = params['ruc'].split('-')[1];

    const id = jsonDteAlgoritmos.generateCodigoControl(params, data, this.codigoSeguridad);
    const digitoVerificador = jsonDteAlgoritmos.calcularDigitoVerificador(rucEmisor, 11);

    if (id.length != 44) {
    }

    const codigoSeguridadAleatorio = this.codigoSeguridad;

    if (constanteService.tiposEmisiones.filter((um) => um.codigo === data['tipoEmision']).length == 0) {
      /*throw new Error(
        "Tipo de Emisión '" +
          data['tipoEmision'] +
          "' en data.tipoEmision no válido. Valores: " +
          constanteService.tiposEmisiones.map((a) => a.codigo + '-' + a.descripcion),
      );*/
    }

    this.json['rDE']['DE']['gOpeDE'] = {
      iTipEmi: data['tipoEmision'],
      dDesTipEmi: constanteService.tiposEmisiones.filter((td) => td.codigo == data['tipoEmision'])[0]['descripcion'],
      dCodSeg: codigoSeguridadAleatorio,
    };

    if (data['observacion'] && data['observacion'].length > 0) {
      this.json['rDE']['DE']['gOpeDE']['dInfoEmi'] = data['observacion'];
    }

    if (data['descripcion'] && data['descripcion'].length > 0) {
      this.json['rDE']['DE']['gOpeDE']['dInfoFisc'] = data['descripcion'];
    }

    //Validar aqui "dInfoFisc"
    if (data['tipoDocumento'] == 7) {
      //Nota de Remision
      if (this.validateError) {
        if (!(data['descripcion'] && data['descripcion'].length > 0)) {
          //throw new Error('Debe informar la Descripción en data.descripcion para el Documento Electrónico');
        }
      }
    }
  }

  /**
     * Genera los datos del timbrado
     * 
     * <gTimb>
			<iTiDE>1</iTiDE>
			<dDesTiDE>Factura electrónica</dDesTiDE>
			<dNumTim>12345678</dNumTim>
			<dEst>001</dEst>
			<dPunExp>001</dPunExp>
			<dNumDoc>1000050</dNumDoc>
			<dSerieNum>AB</dSerieNum>
			<dFeIniT>2019-08-13</dFeIniT>
		</gTimb>

     * @param params 
     * @param data 
     * @param options 
     */
  private generateDatosTimbrado(params: any, data: any) {
    this.json['rDE']['DE']['gTimb'] = {
      iTiDE: data['tipoDocumento'],
      dDesTiDE: data['tipoDocumentoDescripcion'],
      dNumTim: params['timbradoNumero'],
      dEst: stringUtilService.leftZero(data['establecimiento'], 3),
      dPunExp: stringUtilService.leftZero(data['punto'], 3),
      dNumDoc: stringUtilService.leftZero(data['numero'], 7),
      //dSerieNum : null,
      dFeIniT: params['timbradoFecha'].substring(0, 10),
    };

    if (data['numeroSerie']) {
      this.json['rDE']['DE']['gTimb']['dSerieNum'] = data['numeroSerie'];
    }
  }

  /**
     * Genera los campos generales, divide las actividades en diferentes metodos
     * 
     *  <gDatGralOpe>
            <dFeEmiDE>2020-05-07T15:03:57</dFeEmiDE>
        </gDatGralOpe>
     * 
     * @param params 
     * @param data 
     * @param options 
     */
  private generateDatosGenerales(params: any, data: any, config: XmlgenConfig) {
    this.json['rDE']['DE']['gDatGralOpe'] = {
      dFeEmiDE: data['fecha'],
    };
    this.generateDatosGeneralesInherentesOperacion(params, data, config);
    this.generateDatosGeneralesEmisorDE(params, data);
    if (data['usuario']) {
      //No es obligatorio
      this.generateDatosGeneralesResponsableGeneracionDE(params, data);
    }
    this.generateDatosGeneralesReceptorDE(params, data);
  }

  /**
     * D1. Campos inherentes a la operación comercial (D010-D099)
     * Pertenece al grupo de datos generales
     * 
     * <gOpeCom>
            <iTipTra>1</iTipTra>
            <dDesTipTra>Venta de mercadería</dDesTipTra>
            <iTImp>1</iTImp>
            <dDesTImp>IVA</dDesTImp>
            <cMoneOpe>PYG</cMoneOpe>
            <dDesMoneOpe>Guarani</dDesMoneOpe>
        </gOpeCom>
     * @param params 
     * @param data 
     * @param options 
     */
  private generateDatosGeneralesInherentesOperacion(params: any, data: any, config: XmlgenConfig) {
    if (data['tipoDocumento'] == 7) {
      //C002
      return; //No informa si el tipo de documento es 7
    }

    if (!data['tipoImpuesto']) {
      //throw new Error('Debe especificar el Tipo de Impuesto en data.tipoImpuesto');
    }

    if (constanteService.tiposImpuestos.filter((um) => um.codigo === data['tipoImpuesto']).length == 0) {
      /*throw new Error(
        "Tipo de Impuesto '" +
          data['tipoImpuesto'] +
          "' en data.tipoImpuesto no válido. Valores: " +
          constanteService.tiposImpuestos.map((a) => a.codigo + '-' + a.descripcion),
      );*/
    }

    let moneda = data['moneda'];
    if (!moneda && config.defaultValues === true) {
      moneda = 'PYG';
    }

    if (constanteService.monedas.filter((um) => um.codigo === moneda).length == 0) {
      /*throw new Error(
        "Moneda '" +
          moneda +
          "' en data.moneda no válido. Valores: " +
          constanteService.monedas.map((a) => a.codigo + '-' + a.descripcion),
      );*/
    }
    if (data['condicionAnticipo']) {
      if (constanteService.globalPorItem.filter((um) => um.codigo === data['condicionAnticipo']).length == 0) {
        /*throw new Error(
          "Condición de Anticipo '" +
            data['condicionAnticipo'] +
            "' en data.condicionAnticipo no válido. Valores: " +
            constanteService.globalPorItem.map((a) => a.codigo + '-Anticipo ' + a.descripcion),
        );*/
      }
    }
    if (constanteService.tiposTransacciones.filter((um) => um.codigo === data['tipoTransaccion']).length == 0) {
      /*throw new Error(
        "Tipo de Transacción '" +
          data['tipoTransaccion'] +
          "' en data.tipoTransaccion no válido. Valores: " +
          constanteService.tiposTransacciones.map((a) => a.codigo + '-' + a.descripcion),
      );*/
    }

    this.json['rDE']['DE']['gDatGralOpe']['gOpeCom'] = {};

    if (data['tipoDocumento'] == 1 || data['tipoDocumento'] == 4) {
      //Obligatorio informar iTipTra D011
      if (!data['tipoTransaccion']) {
        //throw new Error('Debe proveer el Tipo de Transacción en data.tipoTransaccion');
      }
      this.json['rDE']['DE']['gDatGralOpe']['gOpeCom']['iTipTra'] = data['tipoTransaccion'];
      this.json['rDE']['DE']['gDatGralOpe']['gOpeCom']['dDesTipTra'] = constanteService.tiposTransacciones.filter(
        (tt) => tt.codigo == data['tipoTransaccion'],
      )[0]['descripcion'];
    }

    this.json['rDE']['DE']['gDatGralOpe']['gOpeCom']['iTImp'] = data['tipoImpuesto']; //D013
    this.json['rDE']['DE']['gDatGralOpe']['gOpeCom']['dDesTImp'] = constanteService.tiposImpuestos.filter(
      (ti) => ti.codigo == data['tipoImpuesto'],
    )[0]['descripcion']; //D013
    this.json['rDE']['DE']['gDatGralOpe']['gOpeCom']['cMoneOpe'] = moneda; //D015
    this.json['rDE']['DE']['gDatGralOpe']['gOpeCom']['dDesMoneOpe'] = constanteService.monedas.filter(
      (m) => m.codigo == moneda,
    )[0]['descripcion'];

    if (moneda != 'PYG') {
      if (!data['condicionTipoCambio']) {
        //throw new Error('Debe informar el tipo de Cambio en data.condicionTipoCambio');
      }
      //Obligatorio informar dCondTiCam D017
      this.json['rDE']['DE']['gDatGralOpe']['gOpeCom']['dCondTiCam'] = data['condicionTipoCambio'];
    }
    if (data['condicionTipoCambio'] == 1 && moneda != 'PYG') {
      if (!(data['cambio'] && data['cambio'] > 0)) {
        //throw new Error('Debe informar el valor del Cambio en data.cambio');
      }
      //Obligatorio informar dCondTiCam D018
      this.json['rDE']['DE']['gDatGralOpe']['gOpeCom']['dTiCam'] = data['cambio'];
    }

    if (data['condicionAnticipo']) {
      this.json['rDE']['DE']['gDatGralOpe']['gOpeCom']['iCondAnt'] = data['condicionAnticipo'];
      this.json['rDE']['DE']['gDatGralOpe']['gOpeCom']['dDesCondAnt'] =
        'Anticipo ' +
        constanteService.globalPorItem.filter((ca) => ca.codigo == data['condicionAnticipo'])[0]['descripcion'];
    }
  }

  /**
   * D2. Campos que identifican al emisor del Documento Electrónico DE (D100-D129)
   * Pertenece al grupo de datos generales
   *
   * @param params
   * @param data
   * @param options
   */
  private generateDatosGeneralesEmisorDE(params: any, data: any) {
    if (!(params && params.establecimientos)) {
      //throw new Error('Debe proveer un Array con la información de los establecimientos en params');
    }

    //Validar si el establecimiento viene en params
    let establecimiento = stringUtilService.leftZero(data['establecimiento'], 3);
    //let punto = stringUtilService.leftZero(data['punto'], 3);

    if (params.establecimientos.filter((um: any) => um.codigo === establecimiento).length == 0) {
      /*throw new Error(
        "Establecimiento '" +
          establecimiento +
          "' no encontrado en params.establecimientos*.codigo. Valores: " +
          params.establecimientos.map((a: any) => a.codigo + '-' + a.denominacion),
      );*/
    }
    if (params['ruc'].indexOf('-') == -1) {
      //throw new Error('RUC debe contener dígito verificador en params.ruc');
    }
    this.json['rDE']['DE']['gDatGralOpe']['gEmis'] = {
      dRucEm: params['ruc'].split('-')[0],
      dDVEmi: params['ruc'].split('-')[1],
      iTipCont: params['tipoContribuyente'],
      cTipReg: params['tipoRegimen'],
      dNomEmi: params['razonSocial'],
      dNomFanEmi: params['nombreFantasia'],
      dDirEmi: params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0]['direccion'],
      dNumCas: params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0]['numeroCasa'],
      dCompDir1: params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0][
        'complementoDireccion1'
      ],
      dCompDir2: params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0][
        'complementoDireccion2'
      ],
      cDepEmi: params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0]['departamento'],
      dDesDepEmi: constanteService.departamentos.filter(
        (td) =>
          td.codigo === params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0]['departamento'],
      )[0]['descripcion'],
      cDisEmi: params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0]['distrito'],
      dDesDisEmi: constanteService.distritos.filter(
        (td) =>
          td.codigo === params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0]['distrito'],
      )[0]['descripcion'],
      cCiuEmi: params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0]['ciudad'],
      dDesCiuEmi: constanteService.ciudades.filter(
        (td) => td.codigo === params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0]['ciudad'],
      )[0]['descripcion'],
      dTelEmi: params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0]['telefono'],
      dEmailE: params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0]['email'],
      dDenSuc: params['establecimientos'].filter((e: any) => e.codigo === establecimiento)[0]['denominacion'],
    };

    if (params['actividadesEconomicas'] && params['actividadesEconomicas'].length > 0) {
      this.json['rDE']['DE']['gDatGralOpe']['gEmis']['gActEco'] = [];
      for (let i = 0; i < params['actividadesEconomicas'].length; i++) {
        const actividadEconomica = params['actividadesEconomicas'][i];
        const gActEco = {
          cActEco: actividadEconomica.codigo,
          dDesActEco: actividadEconomica.descripcion,
        };
        this.json['rDE']['DE']['gDatGralOpe']['gEmis']['gActEco'].push(gActEco);
      }
    } else {
      //throw new Error('Debe proveer el array de actividades económicas en params.actividadesEconomicas');
    }
  }

  /**
   * Datos generales del responsable de generacion del DE
   *
   * @param params
   * @param data
   * @param options
   */
  private generateDatosGeneralesResponsableGeneracionDE(params: any, data: any) {
    if (
      constanteService.tiposDocumentosIdentidades.filter((um: any) => um.codigo === data['usuario']['documentoTipo'])
        .length == 0
    ) {
      /*throw new Error(
        "Tipo de Documento '" +
          data['usuario']['documentoTipo'] +
          "' no encontrado en data.usuario.documentoTipo. Valores: " +
          constanteService.tiposDocumentosIdentidades.map((a: any) => a.codigo + '-' + a.descripcion),
      );*/
    }

    this.json['rDE']['DE']['gDatGralOpe']['gEmis']['gRespDE'] = {
      iTipIDRespDE: data['usuario']['documentoTipo'],
      dDTipIDRespDE: constanteService.tiposDocumentosIdentidades.filter(
        (td) => td.codigo === data['usuario']['documentoTipo'],
      )[0]['descripcion'],
    };

    if (this.validateError) {
      if (!data['usuario']['documentoNumero']) {
        //throw new Error('El Documento del responsable en data.usuario.documentoNumero no puede ser vacio');
      }

      if (!data['usuario']['nombre']) {
        //throw new Error('El Nombre del responsable en data.usuario.nombre no puede ser vacio');
      }

      if (!data['usuario']['cargo']) {
        //throw new Error('El Cargo del responsable en data.usuario.cargo no puede ser vacio');
      }
    }
    this.json['rDE']['DE']['gDatGralOpe']['gEmis']['gRespDE']['dNumIDRespDE'] = data['usuario']['documentoNumero'];
    this.json['rDE']['DE']['gDatGralOpe']['gEmis']['gRespDE']['dNomRespDE'] = data['usuario']['nombre'];
    this.json['rDE']['DE']['gDatGralOpe']['gEmis']['gRespDE']['dCarRespDE'] = data['usuario']['cargo'];
  }

  /**
     * Datos generales del receptor del documento electrónico
     * Pertenece al grupo de datos generales
     * 
     * <gDatRec>
                <iNatRec>1</iNatRec>
                <iTiOpe>1</iTiOpe>
                <cPaisRec>PRY</cPaisRec>
                <dDesPaisRe>Paraguay</dDesPaisRe>
                <iTiContRec>2</iTiContRec>
                <dRucRec>00000002</dRucRec>
                <dDVRec>7</dDVRec>
                <dNomRec>RECEPTOR DEL DOCUMENTO</dNomRec>
                <dDirRec>CALLE 1 ENTRE CALLE 2 Y CALLE 3</dDirRec>
                <dNumCasRec>123</dNumCasRec>
                <cDepRec>1</cDepRec>
                <dDesDepRec>CAPITAL</dDesDepRec>
                <cDisRec>1</cDisRec>
                <dDesDisRec>ASUNCION (DISTRITO)</dDesDisRec>
                <cCiuRec>1</cCiuRec>
                <dDesCiuRec>ASUNCION (DISTRITO)</dDesCiuRec>
                <dTelRec>012123456</dTelRec>
                <dCodCliente>AAA</dCodCliente>
            </gDatRec>
     * 
     * @param params 
     * @param data 
     * @param options 
     */
  private generateDatosGeneralesReceptorDE(params: any, data: any) {
    if (!data['cliente']['contribuyente'] && data['cliente']['tipoOperacion'] != 4) {
      if (
        constanteService.tiposDocumentosReceptor.filter((um: any) => um.codigo === data['cliente']['documentoTipo'])
          .length == 0
      ) {
        /*throw new Error(
          "Tipo de Documento '" +
            data['cliente']['documentoTipo'] +
            "' del Cliente en data.cliente.documentoTipo no encontrado. Valores: " +
            constanteService.tiposDocumentosReceptor.map((a: any) => a.codigo + '-' + a.descripcion),
        );*/
      }
    }

    var regExpOnlyNumber = new RegExp(/^\d+$/);
    if (data['cliente']['contribuyente']) {
      if (this.validateError) {
        if (!data['cliente']['ruc']) {
          //throw new Error('Debe proporcionar el RUC en data.cliente.ruc');
        }
        if (data['cliente']['ruc'].indexOf('-') == -1) {
          //throw new Error('RUC debe contener dígito verificador en data.cliente.ruc');
        }

        const rucCliente = data['cliente']['ruc'].split('-');

        if (!regExpOnlyNumber.test((rucCliente[0] + '').trim())) {
          //throw new Error("El RUC del Cliente '" + rucCliente[0] + "' en data.cliente.ruc debe ser numérico");
        }
        if (!regExpOnlyNumber.test((rucCliente[1] + '').trim())) {
          //throw new Error("El DV del RUC del Cliente '" + rucCliente[1] + "' en data.cliente.ruc debe ser numérico");
        }
      }
    }

    if (constanteService.paises.filter((pais: any) => pais.codigo === data['cliente']['pais']).length == 0) {
      /*throw new Error(
        "Pais '" +
          data['cliente']['pais'] +
          "' del Cliente en data.cliente.pais no encontrado. Valores: " +
          constanteService.paises.map((a: any) => a.codigo + '-' + a.descripcion),
      );*/
    }

    if (data['tipoDocumento'] == 4) {
      if (this.validateError) {
        if (data['cliente']['tipoOperacion'] != 2) {
          //throw new Error('El Tipo de Operación debe ser 2-B2C para el Tipo de Documento AutoFactura');
        }
      }
    }

    this.json['rDE']['DE']['gDatGralOpe']['gDatRec'] = {
      iNatRec: data['cliente']['contribuyente'] ? 1 : 2,
      iTiOpe: data['cliente']['tipoOperacion'],
      cPaisRec: data['cliente']['pais'],
      dDesPaisRe: constanteService.paises.filter((pais) => pais.codigo === data['cliente']['pais'])[0]['descripcion'],
    };

    if (data['cliente']['contribuyente']) {
      this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['iTiContRec'] = data['cliente']['tipoContribuyente'];
      this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['dRucRec'] = (data['cliente']['ruc'].split('-')[0] + '').trim();
      this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['dDVRec'] = (data['cliente']['ruc'].split('-')[1] + '').trim();
    }
    if (!data['cliente']['contribuyente'] && data['cliente']['tipoOperacion']) {
      //Obligatorio completar D210

      if (this.validateError) {
        if (data['cliente']['tipoOperacion'] != 4 && !data['cliente']['documentoNumero']) {
          //throw new Error('Debe informar el número de documento en data.cliente.documentoNumero');
        }

        if (!data['cliente']['contribuyente'] && data['cliente']['tipoOperacion'] != 4) {
          if (!data['cliente']['documentoTipo']) {
            //throw new Error('Debe informar el Tipo de Documento del Cliente en data.cliente.documentoTipo');
          }

          this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['iTipIDRec'] = data['cliente']['documentoTipo'];

          this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['dDTipIDRec'] =
            constanteService.tiposDocumentosReceptor.filter(
              (tdr) => tdr.codigo === data['cliente']['documentoTipo'],
            )[0]['descripcion'];

          this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['dNumIDRec'] = data['cliente']['documentoNumero'].trim();
        }

        if (+data['cliente']['documentoTipo'] === 5) {
          //Si es innominado completar con cero
          this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['dNumIDRec'] = '0';
        }
      }
    }

    this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['dNomRec'] = data['cliente']['razonSocial'].trim();

    if (+data['cliente']['documentoTipo'] === 5) {
      this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['dNomRec'] = 'Sin Nombre';
    }

    //if (data['cliente']['documentoTipo'] === 5) {
    if (data['cliente']['nombreFantasia']) {
      this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['dNomFanRec'] = data['cliente']['nombreFantasia'].trim();
    }
    //}

    if (data['tipoDocumento'] === 7 || data['cliente']['tipoOperacion'] === 4) {
      if (!data['cliente']['direccion']) {
        //throw new Error('data.cliente.direccion es Obligatorio para Tipo de Documento 7 o Tipo de Operación 4');
      }
    }

    if (data['cliente']['direccion']) {
      this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['dDirRec'] = data['cliente']['direccion'].trim();

      //Si tiene dirección hay que completar numero de casa.
      if (!data['cliente']['numeroCasa']) {
        //throw new Error('Debe informar el Número de casa del Receptor en data.cliente.numeroCasa');
      }
    }

    if (data['cliente']['numeroCasa']) {
      if (!regExpOnlyNumber.test(data['cliente']['numeroCasa'])) {
        //throw new Error('El Número de Casa en data.cliente.numeroCasa debe ser numérico');
      }
      this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['dNumCasRec'] = (data['cliente']['numeroCasa'] + '').trim();
    }

    if (data['cliente']['direccion'] && data['cliente']['tipoOperacion'] != 4) {
      if (this.validateError) {
        if (!data['cliente']['departamento']) {
          /*throw new Error(
            'Obligatorio especificar el Departamento en data.cliente.departamento para Tipo de Documento != 4',
          );*/
        }
        if (
          constanteService.departamentos.filter(
            (departamento: any) => departamento.codigo === +data['cliente']['departamento'],
          ).length == 0
        ) {
          /*throw new Error(
            "Departamento '" +
              data['cliente']['departamento'] +
              "' del Cliente en data.cliente.departamento no encontrado. Valores: " +
              constanteService.departamentos.map((a: any) => a.codigo + '-' + a.descripcion),
          );*/
        }
      }
      this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['cDepRec'] = +data['cliente']['departamento'];
      this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['dDesDepRec'] = constanteService.departamentos.filter(
        (td) => td.codigo === +data['cliente']['departamento'],
      )[0]['descripcion'];
    }

    if (data['cliente']['direccion'] && data['cliente']['tipoOperacion'] != 4) {
      if (this.validateError) {
        if (!data['cliente']['distrito']) {
          //throw new Error('Obligatorio especificar el Distrito en data.cliente.distrito para Tipo de Documento != 4');
        }

        if (
          constanteService.distritos.filter((distrito: any) => distrito.codigo === +data['cliente']['distrito'])
            .length == 0
        ) {
          /*throw new Error(
            "Distrito '" +
              data['cliente']['distrito'] +
              "' del Cliente en data.cliente.distrito no encontrado. Valores: " +
              constanteService.distritos.map((a: any) => a.codigo + '-' + a.descripcion),
          );*/
        }
      }
      this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['cDisRec'] = +data['cliente']['distrito'];
      this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['dDesDisRec'] = constanteService.distritos.filter(
        (td) => td.codigo === +data['cliente']['distrito'],
      )[0]['descripcion'];
    }
    if (data['cliente']['direccion'] && data['cliente']['tipoOperacion'] != 4) {
      if (this.validateError) {
        if (!data['cliente']['ciudad']) {
          //throw new Error('Obligatorio especificar la Ciudad en data.cliente.ciudad para Tipo de Documento != 4');
        }
        if (
          constanteService.ciudades.filter((ciudad: any) => ciudad.codigo === +data['cliente']['ciudad']).length == 0
        ) {
          /*throw new Error(
            "Ciudad '" +
              data['cliente']['ciudad'] +
              "' del Cliente en data.cliente.ciudad no encontrado. Valores: " +
              constanteService.ciudades.map((a: any) => a.codigo + '-' + a.descripcion),
          );*/
        }
      }
      this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['cCiuRec'] = +data['cliente']['ciudad'];
      this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['dDesCiuRec'] = constanteService.ciudades.filter(
        (td) => td.codigo === +data['cliente']['ciudad'],
      )[0]['descripcion'];
    }

    /*
    constanteService.validateDepartamentoDistritoCiudad(
      'data.cliente',
      +data['cliente']['departamento'],
      +data['cliente']['distrito'],
      +data['cliente']['ciudad'], this.errors
    );
    */

    //Asignar null a departamento, distrito y ciudad si tipoOperacion = 4
    /*    if (data['cliente']['tipoOperacion'] === 4) {
            this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['cDepRec'] = null;
            this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['dDesDepRec'] = null;
            this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['cDisRec'] = null;
            this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['dDesDisRec'] = null;
            this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['cCiuRec'] = null;
            this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['dDesCiuRec'] = null;
        }
    */
    if (data['cliente']['telefono']) {
      if (!(data['cliente']['telefono'].length >= 6 && data['cliente']['telefono'].length <= 15)) {
        /*throw new Error(
          "El valor '" +
            data['cliente']['telefono'] +
            "' en data.cliente.telefono debe tener una longitud de 6 a 15 caracteres",
        );*/
      }
      this.json['rDE']['DE']['gDatGralOpe']['gDatRec'].dTelRec = data['cliente']['telefono'].trim();
    }
    if (data['cliente']['celular']) {
      if (!(data['cliente']['celular'].length >= 10 && data['cliente']['celular'].length <= 20)) {
        /*throw new Error(
          "El valor '" +
            data['cliente']['celular'] +
            "' en data.cliente.celular debe tener una longitud de 10 a 20 caracteres",
        );*/
      }
      this.json['rDE']['DE']['gDatGralOpe']['gDatRec'].dCelRec = data['cliente']['celular'].trim();
    }
    if (data['cliente']['email']) {
      let email = new String(data['cliente']['email']); //Hace una copia, para no alterar.

      //Verificar si tiene varios correos.
      if (email.indexOf(',') > -1) {
        //Si el Email tiene , (coma) entonces va enviar solo el primer valor, ya que la SET no acepta Comas
        email = email.split(',')[0].trim();
      }

      //Verificar espacios
      if (email.indexOf(' ') > -1) {
        //throw new Error("El valor '" + email + "' en data.cliente.email no puede poseer espacios");
      }

      if (!(email.length >= 3 && email.length <= 80)) {
        //throw new Error("El valor '" + email + "' en data.cliente.email debe tener una longitud de 3 a 80 caracteres");
      }
      this.json['rDE']['DE']['gDatGralOpe']['gDatRec'].dEmailRec = email.trim();
    }

    if (data['cliente']['codigo']) {
      if (this.validateError) {
        if (!((data['cliente']['codigo'] + '').length >= 3)) {
          /*throw new Error(
            "El código del Cliente '" +
              data['cliente']['codigo'] +
              "' en data.cliente.codigo debe tener al menos 3 caracteres",
          );*/
        }
      }
      this.json['rDE']['DE']['gDatGralOpe']['gDatRec']['dCodCliente'] = (data['cliente']['codigo'] + '').trim();
    }
  }

  /**
   * Campos que seran especificos de acuerdo a cada tipo de documento electronico
   * Se dividiran en diferentes métodos por cada tipo de factura.
   *
   * @param params
   * @param data
   * @param options
   */
  private generateDatosEspecificosPorTipoDE(params: any, data: any) {
    this.json['rDE']['DE']['gDtipDE'] = {};

    if (data['tipoDocumento'] === 1) {
      this.generateDatosEspecificosPorTipoDE_FacturaElectronica(params, data);
    }
    if (data['tipoDocumento'] === 4) {
      this.generateDatosEspecificosPorTipoDE_Autofactura(params, data);
    }

    if (data['tipoDocumento'] === 5 || data['tipoDocumento'] === 6) {
      this.generateDatosEspecificosPorTipoDE_NotaCreditoDebito(params, data);
    }

    if (data['tipoDocumento'] === 7) {
      this.generateDatosEspecificosPorTipoDE_RemisionElectronica(params, data);
    }
  }

  /**
   * Datos especificos para la factura electronica
   *
   * @param params
   * @param data
   * @param options
   */
  private generateDatosEspecificosPorTipoDE_FacturaElectronica(params: any, data: any) {
    if (
      constanteService.indicadoresPresencias.filter((um: any) => um.codigo === data['factura']['presencia']).length == 0
    ) {
      /*throw new Error(
        "Indicador de Presencia '" +
          data['factura']['presencia'] +
          "' en data.factura.presencia no encontrado. Valores: " +
          constanteService.indicadoresPresencias.map((a: any) => a.codigo + '-' + a.descripcion),
      );*/
    }

    this.json['rDE']['DE']['gDtipDE']['gCamFE'] = {
      iIndPres: data['factura']['presencia'],
      dDesIndPres: constanteService.indicadoresPresencias.filter((ip) => ip.codigo === data['factura']['presencia'])[0][
        'descripcion'
      ],
      //dFecEmNR : data['factura']['fechaEnvio']
    };

    if (data['factura']['fechaEnvio']) {
      let fechaFactura = new Date(data['fecha']);
      let fechaEnvio = new Date(data['factura']['fechaEnvio']);

      if (fechaFactura.getTime() > fechaEnvio.getTime()) {
        /*throw new Error(
          "La Fecha de envío '" +
            data['factura']['fechaEnvio'] +
            "'en data.factura.fechaEnvio, debe ser despues de la fecha de Factura",
        );*/
      }
      this.json['rDE']['DE']['gDtipDE']['gCamFE']['dFecEmNR'] = data['factura']['fechaEnvio'];
    }
    if (data['cliente']['tipoOperacion'] === 3) {
      this.generateDatosEspecificosPorTipoDE_ComprasPublicas(params, data);
    }
  }

  /**
   * Datos especificos cuando el tipo de operacion del receptor es B2G (Campo D202)
   * Dentro de la factura electronica
   *
   * @param params
   * @param data
   * @param options
   */
  private generateDatosEspecificosPorTipoDE_ComprasPublicas(params: any, data: any) {
    if (!(data['dncp'] && data['dncp']['modalidad'] && data['dncp']['modalidad'].length > 0)) {
      //throw new Error('Debe informar la modalidad de Contratación DNCP en data.dncp.modalidad');
    }
    if (!(data['dncp'] && data['dncp']['entidad'] && data['dncp']['entidad'].length > 0)) {
      //throw new Error('Debe informar la entidad de Contratación DNCP en data.dncp.entidad');
    }
    if (!(data['dncp'] && data['dncp']['año'] && data['dncp']['año'].length > 0)) {
      //throw new Error('Debe informar la año de Contratación DNCP en data.dncp.año');
    }
    if (!(data['dncp'] && data['dncp']['secuencia'] && data['dncp']['secuencia'].length > 0)) {
      //throw new Error('Debe informar la secuencia de Contratación DNCP en data.dncp.secuencia');
    }
    if (!(data['dncp'] && data['dncp']['fecha'] && data['dncp']['fecha'].length > 0)) {
      //throw new Error('Debe informar la fecha de emisión de código de Contratación DNCP en data.dncp.fecha');
    }

    this.json['rDE']['DE']['gDtipDE']['gCamFE']['gCompPub'] = {
      dModCont: data['dncp']['modalidad'],
      dEntCont: data['dncp']['entidad'],
      dAnoCont: data['dncp']['año'],
      dSecCont: data['dncp']['secuencia'],
      dFeCodCont: data['dncp']['fecha'],
    };
  }

  private generateDatosEspecificosPorTipoDE_Autofactura(params: any, data: any) {
    if (this.validateError) {
      if (!data['autoFactura']) {
        //throw new Error('Para tipoDocumento = 4 debe proveer los datos de Autofactura en data.autoFactura');
      }
      if (!data['autoFactura']['ubicacion']) {
        /*throw new Error(
          'Para tipoDocumento = 4 debe proveer los datos del Lugar de Transacción de la Autofactura en data.autoFactura.ubicacion',
        );*/
      }

      if (!data['autoFactura']['tipoVendedor']) {
        //throw new Error('Debe especificar la Naturaleza del Vendedor en data.autoFactura.tipoVendedor');
      }

      if (!data['autoFactura']['documentoTipo']) {
        //throw new Error('Debe especificar el Tipo de Documento del Vendedor en data.autoFactura.documentoTipo');
      }
    }

    if (
      constanteService.naturalezaVendedorAutofactura.filter(
        (um: any) => um.codigo === data['autoFactura']['tipoVendedor'],
      ).length == 0
    ) {
      /*throw new Error(
        "Tipo de Vendedor '" +
          data['autoFactura']['tipoVendedor'] +
          "' en data.autoFactura.tipoVendedor no encontrado. Valores: " +
          constanteService.naturalezaVendedorAutofactura.map((a: any) => a.codigo + '-' + a.descripcion),
      );*/
    }

    if (
      constanteService.tiposDocumentosIdentidades.filter(
        (um: any) => um.codigo === data['autoFactura']['documentoTipo'],
      ).length == 0
    ) {
      /*throw new Error(
        "Tipo de Documento '" +
          data['autoFactura']['documentoTipo'] +
          "' en data.autoFactura.documentoTipo no encontrado. Valores: " +
          constanteService.tiposDocumentosIdentidades.map((a: any) => a.codigo + '-' + a.descripcion),
      );*/
    }

    if (this.validateError) {
      if (!data['autoFactura']['ubicacion']) {
        //throw new Error('Debe especificar la ubicación de la transacción en data.autoFactura.ubicacion');
      }

      if (!data['autoFactura']['documentoNumero']) {
        //throw new Error('Debe especificar el Nro. de Documento del Vendedor en data.autoFactura.documentoNumero');
      }
      if (!data['autoFactura']['nombre']) {
        //throw new Error('Debe especificar el Nombre del Vendedor en data.autoFactura.nombre');
      }
      if (!data['autoFactura']['direccion']) {
        //throw new Error('Debe especificar la Dirección del Vendedor en data.autoFactura.direccion');
      }
      if (!data['autoFactura']['numeroCasa']) {
        //throw new Error('Debe especificar el Número de Casa del Vendedor en data.autoFactura.numeroCasa');
      }

      if (!data['autoFactura']['departamento']) {
        //throw new Error('Debe especificar el Departamento del Vendedor en data.autoFactura.departamento');
      }
      if (!data['autoFactura']['distrito']) {
        //throw new Error('Debe especificar el Distrito Vendedor en data.autoFactura.distrito');
      }
      if (!data['autoFactura']['ciudad']) {
        //throw new Error('Debe especificar la Ciudad del Vendedor en data.autoFactura.ciudad');
      }

      if (!data['autoFactura']['ubicacion']['departamento']) {
        /*throw new Error(
          'Debe especificar el Departamento del Lugar de la Transacción en data.autoFactura.ubicacion.departamento',
        );*/
      }
      if (!data['autoFactura']['ubicacion']['distrito']) {
        /*throw new Error(
          'Debe especificar el Distrito del Lugar de la Transacciónen data.autoFactura.ubicacion.distrito',
        );*/
      }
      if (!data['autoFactura']['ubicacion']['ciudad']) {
        //throw new Error('Debe especificar la Ciudad del Lugar de la Transacción en data.autoFactura.ubicacion.ciudad');
      }
    }

    this.json['rDE']['DE']['gDtipDE']['gCamAE'] = {
      iNatVen: data['autoFactura']['tipoVendedor'], //1=No contribuyente, 2=Extranjero
      dDesNatVen: constanteService.naturalezaVendedorAutofactura.filter(
        (nv) => nv.codigo === data['autoFactura']['tipoVendedor'],
      )[0]['descripcion'],
      iTipIDVen: data['autoFactura']['documentoTipo'],
      dDTipIDVen: constanteService.tiposDocumentosIdentidades.filter(
        (td) => td.codigo === data['autoFactura']['documentoTipo'],
      )[0]['descripcion'],
      dNumIDVen: data['autoFactura']['documentoNumero'],
      dNomVen: data['autoFactura']['nombre'],
      dDirVen: data['autoFactura']['direccion'],
      dNumCasVen: data['autoFactura']['numeroCasa'],

      cDepVen: +data['autoFactura']['departamento'],
      dDesDepVen: constanteService.departamentos.filter((td) => td.codigo === +data['autoFactura']['departamento'])[0][
        'descripcion'
      ],
      cDisVen: +data['autoFactura']['distrito'],
      dDesDisVen: constanteService.distritos.filter((td) => td.codigo === +data['autoFactura']['distrito'])[0][
        'descripcion'
      ],
      cCiuVen: +data['autoFactura']['ciudad'],
      dDesCiuVen: constanteService.ciudades.filter((td) => td.codigo === +data['autoFactura']['ciudad'])[0][
        'descripcion'
      ],
      dDirProv: data['autoFactura']['ubicacion']['lugar'],
      cDepProv: +data['autoFactura']['ubicacion']['departamento'],
      dDesDepProv: constanteService.departamentos.filter(
        (td) => td.codigo === +data['autoFactura']['ubicacion']['departamento'],
      )[0]['descripcion'],
      cDisProv: +data['autoFactura']['ubicacion']['distrito'],
      dDesDisProv: constanteService.distritos.filter(
        (td) => td.codigo === +data['autoFactura']['ubicacion']['distrito'],
      )[0]['descripcion'],
      cCiuProv: +data['autoFactura']['ubicacion']['ciudad'],
      dDesCiuProv: constanteService.ciudades.filter(
        (td) => td.codigo === +data['autoFactura']['ubicacion']['ciudad'],
      )[0]['descripcion'],
    };

    /*
    constanteService.validateDepartamentoDistritoCiudad(
      'data.autoFactura',
      +data['autoFactura']['departamento'],
      +data['autoFactura']['distrito'],
      +data['autoFactura']['ciudad'],
    );
    constanteService.validateDepartamentoDistritoCiudad(
      'data.autoFactura.ubicacion',
      +data['autoFactura']['ubicacion']['departamento'],
      +data['autoFactura']['ubicacion']['distrito'],
      +data['autoFactura']['ubicacion']['ciudad'],
    );
    */
  }

  private generateDatosEspecificosPorTipoDE_NotaCreditoDebito(params: any, data: any) {
    if (this.validateError) {
      if (!data['notaCreditoDebito']['motivo']) {
        //throw new Error('Debe completar el motivo para la nota de crédito/débito en data.notaCreditoDebito.motivo');
      }
    }
    if (
      constanteService.notasCreditosMotivos.filter((um: any) => um.codigo === data['notaCreditoDebito']['motivo'])
        .length == 0
    ) {
      /*throw new Error(
        "Motivo de la Nota de Crédito/Débito '" +
          data['notaCreditoDebito']['motivo'] +
          "' en data.notaCreditoDebito.motivo no encontrado. Valores: " +
          constanteService.notasCreditosMotivos.map((a: any) => a.codigo + '-' + a.descripcion),
      );*/
    }

    this.json['rDE']['DE']['gDtipDE']['gCamNCDE'] = {
      iMotEmi: data['notaCreditoDebito']['motivo'],
      dDesMotEmi: constanteService.notasCreditosMotivos.filter(
        (nv) => nv.codigo === data['notaCreditoDebito']['motivo'],
      )[0]['descripcion'],
    };
  }

  private generateDatosEspecificosPorTipoDE_RemisionElectronica(params: any, data: any) {
    if (this.validateError) {
      if (!(data['remision'] && data['remision']['motivo'])) {
        //throw new Error('No fue pasado el Motivo de la Remisión en data.remision.motivo.');
      }
      if (!(data['remision'] && data['remision']['tipoResponsable'])) {
        //throw new Error('No fue pasado el Tipo de Responsable de la Remisión en data.remision.tipoResponsable.');
      }
    }
    if (constanteService.remisionesMotivos.filter((um: any) => um.codigo === data['remision']['motivo']).length == 0) {
      /*throw new Error(
        "Motivo de la Remisión '" +
          data['remision']['motivo'] +
          "' en data.remision.motivo no encontrado. Valores: " +
          constanteService.remisionesMotivos.map((a: any) => a.codigo + '-' + a.descripcion),
      );*/
    }
    if (
      constanteService.remisionesResponsables.filter((um: any) => um.codigo === data['remision']['tipoResponsable'])
        .length == 0
    ) {
      /*throw new Error(
        "Tipo de Responsable '" +
          data['remision']['tipoResponsable'] +
          "' en data.remision.tipoResponsable no encontrado. Valores: " +
          constanteService.remisionesResponsables.map((a: any) => a.codigo + '-' + a.descripcion),
      );*/
    }

    this.json['rDE']['DE']['gDtipDE']['gCamNRE'] = {
      iMotEmiNR: data['remision']['motivo'], //E501
      dDesMotEmiNR: constanteService.remisionesMotivos.filter((nv) => nv.codigo === data['remision']['motivo'])[0][
        'descripcion'
      ],
      iRespEmiNR: data['remision']['tipoResponsable'],
      dDesRespEmiNR: constanteService.remisionesResponsables.filter(
        (nv) => nv.codigo === data['remision']['tipoResponsable'],
      )[0]['descripcion'],
      dKmR: data['remision']['kms'],
      dFecEm: data['remision']['fechaFactura'],
    };
  }

  /**
   * E7. Campos que describen la condición de la operación (E600-E699)
   * @param params
   * @param data
   * @param options
   */
  private generateDatosCondicionOperacionDE(params: any, data: any) {
    if (
      constanteService.condicionesOperaciones.filter((um: any) => um.codigo === data['condicion']['tipo']).length == 0
    ) {
      /*throw new Error(
        "Condición de la Operación '" +
          data['condicion']['tipo'] +
          "' en data.condicion.tipo no encontrado. Valores: " +
          constanteService.condicionesOperaciones.map((a: any) => a.codigo + '-' + a.descripcion),
      );*/
    }

    this.json['rDE']['DE']['gDtipDE']['gCamCond'] = {
      iCondOpe: data['condicion']['tipo'],
      dDCondOpe: constanteService.condicionesOperaciones.filter((co) => co.codigo === data['condicion']['tipo'])[0][
        'descripcion'
      ],
    };

    //if (data['condicion']['tipo'] === 1) {
    this.generateDatosCondicionOperacionDE_Contado(params, data);
    //}

    if (data['condicion']['tipo'] === 2) {
      this.generateDatosCondicionOperacionDE_Credito(params, data);
    }
  }

  /**
   * E7.1. Campos que describen la forma de pago de la operación al contado o del monto
   * de la entrega inicial (E605-E619)
   * @param params
   * @param data
   * @param options
   */
  private generateDatosCondicionOperacionDE_Contado(params: any, data: any) {
    if (data['condicion']['tipo'] === 1) {
      if (!(data['condicion']['entregas'] && data['condicion']['entregas'].length > 0)) {
        /*throw new Error(
          'El Tipo de Condición es 1 en data.condicion.tipo pero no se encontraron entregas en data.condicion.entregas',
        );*/
      }
    }

    if (data['condicion']['entregas'] && data['condicion']['entregas'].length > 0) {
      const entregas = [];
      for (let i = 0; i < data['condicion']['entregas'].length; i++) {
        const dataEntrega = data['condicion']['entregas'][i];

        if (constanteService.condicionesTiposPagos.filter((um: any) => um.codigo === dataEntrega['tipo']).length == 0) {
          /*throw new Error(
            "Condición de Tipo de Pago '" +
              dataEntrega['tipo'] +
              "' en data.condicion.entregas[" +
              i +
              '].tipo no encontrado. Valores: ' +
              constanteService.condicionesTiposPagos.map((a: any) => a.codigo + '-' + a.descripcion),
          );*/
        }

        const cuotaInicialEntrega: any = {
          iTiPago: dataEntrega['tipo'],
          dDesTiPag: constanteService.condicionesTiposPagos.filter((co) => co.codigo === dataEntrega['tipo'])[0][
            'descripcion'
          ],
          dMonTiPag: dataEntrega['monto'],
          //cMoneTiPag: dataEntrega['moneda'],
          //dTiCamTiPag : dataEntrega['cambio'],
        };

        if (!dataEntrega['moneda']) {
          //throw new Error('Moneda es obligatorio en data.condicion.entregas[' + i + '].moneda');
        }

        if (constanteService.monedas.filter((um) => um.codigo === dataEntrega['moneda']).length == 0) {
          /*throw new Error("Moneda '" + dataEntrega['moneda']) +
            "' data.condicion.entregas[" +
            i +
            '].moneda no válido. Valores: ' +
            constanteService.monedas.map((a) => a.codigo + '-' + a.descripcion);*/
        }

        cuotaInicialEntrega['cMoneTiPag'] = dataEntrega['moneda'];
        cuotaInicialEntrega['dDMoneTiPag'] = constanteService.monedas.filter(
          (m) => m.codigo == dataEntrega['moneda'],
        )[0]['descripcion'];

        if (dataEntrega['moneda'] != 'PYG') {
          if (dataEntrega['cambio']) {
            cuotaInicialEntrega['dTiCamTiPag'] = dataEntrega['cambio'];
          }
        }

        //Verificar si el Pago es con Tarjeta de crédito
        if (dataEntrega['tipo'] === 3 || dataEntrega['tipo'] === 4) {
          if (!dataEntrega['infoTarjeta']) {
            /*throw new Error(
              'Debe informar sobre la tarjeta en data.condicion.entregas[' +
                i +
                '].infoTarjeta si la forma de Pago es a Tarjeta',
            );*/
          }

          if (
            constanteService.condicionesOperaciones.filter(
              (um: any) => um.codigo === dataEntrega['infoTarjeta']['tipo'],
            ).length == 0
          ) {
            /*throw new Error(
              "Tipo de Tarjeta de Crédito '" +
                dataEntrega['infoTarjeta']['tipo'] +
                "' en data.condicion.entregas[" +
                i +
                '].infoTarjeta.tipo no encontrado. Valores: ' +
                constanteService.condicionesOperaciones.map((a: any) => a.codigo + '-' + a.descripcion),
            );*/
          }

          if (dataEntrega['infoTarjeta']['ruc'].indexOf('-') == -1) {
            /*throw new Error(
              'Ruc de Proveedor de Tarjeta debe contener digito verificador en data.condicion.entregas[' +
                i +
                '].infoTarjeta.ruc',
            );*/
          }
          cuotaInicialEntrega['gPagTarCD'] = {
            iDenTarj: dataEntrega['infoTarjeta']['tipo'],
            dDesDenTarj:
              dataEntrega['infoTarjeta']['tipo'] === 99
                ? dataEntrega['infoTarjeta']['tipoDescripcion']
                : constanteService.tarjetasCreditosTipos.filter(
                    (co) => co.codigo === dataEntrega['infoTarjeta']['tipo'],
                  )[0]['descripcion'],
          };

          if (dataEntrega['infoTarjeta']['razonSocial'] && dataEntrega['infoTarjeta']['ruc']) {
            //Solo si se envia éste dato
            cuotaInicialEntrega['gPagTarCD']['dRSProTar'] = dataEntrega['infoTarjeta']['razonSocial'];
            cuotaInicialEntrega['gPagTarCD']['dRUCProTar'] = dataEntrega['infoTarjeta']['ruc'].split('-')[0];
            cuotaInicialEntrega['gPagTarCD']['dDVProTar'] = dataEntrega['infoTarjeta']['ruc'].split('-')[1];
          }

          cuotaInicialEntrega['gPagTarCD']['iForProPa'] = dataEntrega['infoTarjeta']['medioPago'];

          if (dataEntrega['infoTarjeta']['codigoAutorizacion']) {
            if (
              !(
                (dataEntrega['infoTarjeta']['codigoAutorizacion'] + '').length >= 6 &&
                (dataEntrega['infoTarjeta']['codigoAutorizacion'] + '').length <= 10
              )
            ) {
              /*throw new Error(
                'El código de Autorización en data.condicion.entregas[' +
                  i +
                  '].infoTarjeta.codigoAutorizacion debe tener de 6 y 10 caracteres',
              );*/
            }
            cuotaInicialEntrega['gPagTarCD']['dCodAuOpe'] = +dataEntrega['infoTarjeta']['codigoAutorizacion'];
          }

          if (dataEntrega['infoTarjeta']['titular']) {
            cuotaInicialEntrega['gPagTarCD']['dNomTit'] = dataEntrega['infoTarjeta']['titular'];
          }

          if (dataEntrega['infoTarjeta']['numero']) {
            if (!((dataEntrega['infoTarjeta']['numero'] + '').length == 4)) {
              /*throw new Error(
                'El código de Autorización en data.condicion.entregas[' +
                  i +
                  '].infoTarjeta.numero debe tener de 4 caracteres',
              );*/
            }

            cuotaInicialEntrega['gPagTarCD']['dNumTarj'] = dataEntrega['infoTarjeta']['numero'];
          }
        }

        //Verificar si el Pago es con Cheque
        if (dataEntrega['tipo'] === 2) {
          if (!dataEntrega['infoCheque']) {
            /*throw new Error(
              'Debe informar sobre el cheque en data.condicion.entregas[' +
                i +
                '].infoCheque si la forma de Pago es 2-Cheques',
            );*/
          }

          cuotaInicialEntrega['gPagCheq'] = {
            dNumCheq: stringUtilService.leftZero(dataEntrega['infoCheque']['numeroCheque'], 8),
            dBcoEmi: dataEntrega['infoCheque']['banco'],
          };
        }
        entregas.push(cuotaInicialEntrega);
      }
      this.json['rDE']['DE']['gDtipDE']['gCamCond']['gPaConEIni'] = entregas; //Array de Entregas
    }
  }

  /**
   * E7.2. Campos que describen la operación a crédito (E640-E649)
   *
   * @param params
   * @param data
   * @param options
   */
  private generateDatosCondicionOperacionDE_Credito(params: any, data: any) {
    if (!data['condicion']['credito']['tipo']) {
      /*throw new Error(
        'El tipo de Crédito en data.condicion.credito.tipo es obligatorio si la condición posee créditos',
      );*/
    }

    if (
      constanteService.condicionesCreditosTipos.filter((um: any) => um.codigo === data['condicion']['credito']['tipo'])
        .length == 0
    ) {
      /*throw new Error(
        "Tipo de Crédito '" +
          data['condicion']['credito']['tipo'] +
          "' en data.condicion.credito.tipo no encontrado. Valores: " +
          constanteService.condicionesCreditosTipos.map((a: any) => a.codigo + '-' + a.descripcion),
      );*/
    }

    this.json['rDE']['DE']['gDtipDE']['gCamCond']['gPagCred'] = {
      iCondCred: data['condicion']['credito']['tipo'],
      dDCondCred: constanteService.condicionesCreditosTipos.filter(
        (co) => co.codigo === +data['condicion']['credito']['tipo'],
      )[0]['descripcion'],
    };

    if (+data['condicion']['credito']['tipo'] === 1) {
      //Plazo
      if (!data['condicion']['credito']['plazo']) {
        /*throw new Error(
          'El tipo de Crédito en data.condicion.credito.tipo es 1 entonces data.condicion.credito.plazo es obligatorio',
        );*/
      }
      this.json['rDE']['DE']['gDtipDE']['gCamCond']['gPagCred']['dPlazoCre'] = data['condicion']['credito']['plazo'];
    }

    if (+data['condicion']['credito']['tipo'] === 2) {
      //Cuota
      if (!data['condicion']['credito']['cuotas']) {
        /*throw new Error(
          'El tipo de Crédito en data.condicion.credito.tipo es 2 entonces data.condicion.credito.cuotas es obligatorio',
        );*/
      }

      this.json['rDE']['DE']['gDtipDE']['gCamCond']['gPagCred']['dCuotas'] = +data['condicion']['credito']['cuotas'];
    }

    if (data['condicion']['entregas'] && data['condicion']['entregas'].length > 0) {
      let sumaEntregas = 0;
      //Obtiene la sumatoria
      for (let i = 0; i < data['condicion']['entregas'].length; i++) {
        const entrega = data['condicion']['entregas'][i];
        sumaEntregas += entrega['monto']; //Y cuando es de moneda diferente ? como hace?
      }

      this.json['rDE']['DE']['gDtipDE']['gCamCond']['gPagCred']['dMonEnt'] = sumaEntregas;
    }

    //Recorrer array de infoCuotas e informar en el JSON
    if (data['condicion']['credito']['tipo'] === 2) {
      this.json['rDE']['DE']['gDtipDE']['gCamCond']['gPagCred']['gCuotas'] = [];
      //A Cuotas
      if (data['condicion']['credito']['infoCuotas'] && data['condicion']['credito']['infoCuotas'].length > 0) {
        for (let i = 0; i < data['condicion']['credito']['infoCuotas'].length; i++) {
          const infoCuota = data['condicion']['credito']['infoCuotas'][i];

          if (constanteService.monedas.filter((um: any) => um.codigo === infoCuota['moneda']).length == 0) {
            /*throw new Error(
              "Moneda '" +
                infoCuota['moneda'] +
                "' en data.condicion.credito.infoCuotas[" +
                i +
                '].moneda no encontrado. Valores: ' +
                constanteService.monedas.map((a: any) => a.codigo + '-' + a.descripcion),
            );*/
          }

          const gCuotas = {
            cMoneCuo: infoCuota['moneda'],
            dDMoneCuo: constanteService.monedas.filter((co) => co.codigo === infoCuota['moneda'])[0]['descripcion'],
            dMonCuota: infoCuota['monto'],
            dVencCuo: infoCuota['vencimiento'],
          };

          this.json['rDE']['DE']['gDtipDE']['gCamCond']['gPagCred']['gCuotas'].push(gCuotas);
        }
      } else {
        //throw new Error('Debe proporcionar data.condicion.credito.infoCuotas[]');
      }
    }
  }

  private normalizeXML(xml: string) {
    xml = xml.split('\r\n').join('');
    xml = xml.split('\n').join('');
    xml = xml.split('\t').join('');
    xml = xml.split('    ').join('');
    xml = xml.split('>    <').join('><');
    xml = xml.split('>  <').join('><');
    xml = xml.replace(/\r?\n|\r/g, '');
    return xml;
  }

  getDepartamentos() {
    return constanteService.departamentos;
  }

  getDistritos(departamento: number) {
    return constanteService.distritos.filter((dis) => dis.departamento === departamento);
  }

  getCiudades(distrito: number) {
    return constanteService.ciudades.filter((ciu) => ciu.distrito === distrito);
  }

  getTiposRegimenes() {
    return constanteService.tiposRegimenes;
  }

  getDepartamento(departamentoId: number) {
    return constanteService.departamentos.filter((dis) => dis.codigo === departamentoId);
  }

  getDistrito(distritoId: number) {
    return constanteService.distritos.filter((dis) => dis.codigo === distritoId);
  }

  getCiudad(ciudadId: number) {
    return constanteService.ciudades.filter((ciu) => ciu.codigo === ciudadId);
  }
}

export default new JSonDeMainService();
