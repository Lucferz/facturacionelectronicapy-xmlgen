import stringUtilService from './StringUtil.service';
import constanteService from './Constante.service';

class JSonDteItemValidateService {
  errors: Array<string>;

  constructor() {
    this.errors = new Array();
  }
  /**
   * E8. Campos que describen los ítems de la operación (E700-E899)
   *
   * @param params
   * @param data
   * @param options
   */
  public generateDatosItemsOperacionValidate(params: any, data: any, errors: Array<string>) {
    this.errors = errors;

    const jsonResult: any = [];

    //Recorrer array de items e informar en el JSON
    if (data['items'] && data['items'].length > 0) {
      for (let i = 0; i < data['items'].length; i++) {
        const item = data['items'][i];

        let unidadMedida: number = item['unidadMedida'];

        //Validaciones
        if (constanteService.unidadesMedidas.filter((um) => um.codigo === unidadMedida).length == 0) {
          this.errors.push(
            "Unidad de Medida '" +
              unidadMedida +
              "' en data.items[" +
              i +
              '].unidadMedida no encontrado. Valores: ' +
              constanteService.unidadesMedidas.map((a) => a.codigo + '-' + a.descripcion.trim()),
          );
        }
        if (data['tipoDocumento'] === 7) {
          if (!item['tolerancia']) {
            this.errors.push(
              'La Tolerancia es obligatoria para el Tipo de Documento = 7 en data.items[' + i + '].tolerancia',
            );
          }
          if (constanteService.relevanciasMercaderias.filter((um) => um.codigo === item['tolerancia']).length == 0) {
            this.errors.push(
              "Tolerancia de Mercaderia '" +
                item['tolerancia'] +
                "' en data.items[" +
                i +
                '].tolerancia no encontrado. Valores: ' +
                constanteService.relevanciasMercaderias.map((a) => a.codigo + '-' + a.descripcion),
            );
          }
        }

        if (!item['descripcion']) {
          this.errors.push('La descripción del item en data.items[' + i + '].descripcion no puede ser null');
        }

        if (!(item['descripcion'].length >= 1 && item['descripcion'].length <= 120)) {
          this.errors.push(
            'La descripción del item (' +
              item['descripcion'] +
              ') en data.items[' +
              i +
              '].descripcion debe tener una longitud de 1 a 120 caracteres',
          );
        }

        let regexp = new RegExp('<[^>]*>'); //HTML/XML TAGS
        if (regexp.test(item['descripcion'])) {
          this.errors.push(
            'La descripción del item (' +
              item['descripcion'] +
              ') en data.items[' +
              i +
              '].descripcion contiene valores inválidos',
          );
        }

        if (+item['cantidad'] <= 0) {
          this.errors.push('La cantidad del item en data.items[' + i + '].cantidad debe ser mayor a cero');
        }

        if (item['pais']) {
          if (constanteService.paises.filter((pais: any) => pais.codigo === item['pais']).length == 0) {
            this.errors.push(
              "Pais '" +
                item['pais'] +
                "' del Producto en data.items[" +
                i +
                '].pais no encontrado. Valores: ' +
                constanteService.paises.map((a: any) => a.codigo + '-' + a.descripcion),
            );
          }
        }

        if (item['observacion'] && item['observacion'].trim().length > 0) {
          if (!(item['observacion'].length >= 1 && item['observacion'].length <= 500)) {
            this.errors.push(
              'La observación del item (' +
                item['observacion'] +
                ') en data.items[' +
                i +
                '].observacion debe tener una longitud de 1 a 500 caracteres',
            );
          }
          if (regexp.test(item['observacion'])) {
            this.errors.push(
              'La observación del item (' +
                item['observacion'] +
                ') en data.items[' +
                i +
                '].observacion contiene valores inválidos',
            );
          }
        }

        //Tratamiento E719. Tiene relacion con generateDatosGeneralesInherentesOperacion
        if (data['tipoDocumento'] == 1 || data['tipoDocumento'] == 4) {
          if (data['tipoTransaccion'] === 9) {
            if (!item['cdcAnticipo']) {
              this.errors.push('Debe informar data.items*.cdcAnticipo');
            }
          }
        }

        if (data['tipoDocumento'] != 7) {
          //Oblitatorio informar
          this.generateDatosItemsOperacionDescuentoAnticipoValorTotalValidate(params, data, item, i);
        }

        if (
          data['tipoImpuesto'] == 1 ||
          data['tipoImpuesto'] == 3 ||
          data['tipoImpuesto'] == 4 ||
          data['tipoImpuesto'] == 5
        ) {
          if (data['tipoDocumento'] != 4 && data['tipoDocumento'] != 7) {
            this.generateDatosItemsOperacionIVAValidate(params, data, item, i);
          }
        }

        //Rastreo
        if (
          item['lote'] ||
          item['vencimiento'] ||
          item['numeroSerie'] ||
          item['numeroPedido'] ||
          item['numeroSeguimiento']
        ) {
          this.generateDatosItemsOperacionRastreoMercaderiasValidate(params, data, item, i);
        }

        //Automotores
        if (item['sectorAutomotor'] && item['sectorAutomotor']['tipo']) {
          this.generateDatosItemsOperacionSectorAutomotoresValidate(params, data, item, i);
        }
      } //end-for
    }
    return this.errors;
  }

  /**
   * E8.1.1 Campos que describen los descuentos, anticipos y valor total por ítem (EA001-EA050)
   *
   * @param params
   * @param data
   * @param options
   * @param items Es el item actual del array de items de "data" que se está iterando
   */
  private generateDatosItemsOperacionDescuentoAnticipoValorTotalValidate(params: any, data: any, item: any, i: number) {
    const jsonResult: any = {};

    if (item['descuento'] && +item['descuento'] > 0) {
      //Validar que si el descuento es mayor al precio
      if (+item['descuento'] > +item['precioUnitario']) {
        this.errors.push(
          "Descuento '" +
            item['descuento'] +
            "' del Producto en data.items[" +
            i +
            "].descuento supera al Precio Unitario '" +
            item['precioUnitario'],
        );
      }

      if (+item['descuento'] == +item['precioUnitario']) {
        //Validar IVA
        //Quiere decir que no va a ir nada en exenta, gravada5 y gravada10, para este item.
        if (item['ivaTipo'] != 3) {
          this.errors.push(
            'Descuento igual a Precio Unitario corresponde tener Tipo de Iva = 3-Exento en data.items[' +
              i +
              '].ivaTipo',
          );
        }
      }
    }
  }

  /**
   * E8.2. Campos que describen el IVA de la operación por ítem (E730-E739)
   *
   * @param params
   * @param data
   * @param options
   * @param items Es el item actual del array de items de "data" que se está iterando
   */
  private generateDatosItemsOperacionIVAValidate(params: any, data: any, item: any, i: number) {
    if (constanteService.codigosAfectaciones.filter((um) => um.codigo === item['ivaTipo']).length == 0) {
      this.errors.push(
        "Tipo de IVA '" +
          item['ivaTipo'] +
          "' en data.items[" +
          i +
          '].ivaTipo no encontrado. Valores: ' +
          constanteService.codigosAfectaciones.map((a) => a.codigo + '-' + a.descripcion),
      );
    }

    if (item['ivaTipo'] == 1) {
      if (item['ivaBase'] != 100) {
        this.errors.push(
          'Valor de "ivaBase"=' +
            item['ivaBase'] +
            ' debe ser igual a 100 para "ivaTipo" = 1 en data.items[' +
            i +
            '].ivaBase',
        );
      }
    }

    if (item['ivaTipo'] == 3) {
      //Exento
      if (item['ivaBase'] != 0) {
        this.errors.push(
          'Valor de "ivaBase"=' +
            item['ivaBase'] +
            ' debe ser igual a 0 para "ivaTipo" = 3 en data.items[' +
            i +
            '].ivaBase',
        );
      }

      if (item['iva'] != 0) {
        this.errors.push(
          'Valor de "iva"=' + item['iva'] + ' debe ser igual a 0 para "ivaTipo" = 3 en data.items[' + i + '].iva',
        );
      }
    }

    if (item['iva'] == 0) {
      if (item['ivaTipo'] != 2 && item['ivaTipo'] != 3) {
        this.errors.push(
          '"Iva" = 0 no se admite para "ivaTipo"=' + item['ivaTipo'] + ' proporcionado en data.items[' + i + '].iva',
        );
      }
    }

    if (item['iva'] == 5) {
      if (item['ivaTipo'] != 1 && item['ivaTipo'] != 4) {
        this.errors.push(
          '"Iva" = 5 no se admite para "ivaTipo"=' + item['ivaTipo'] + ' proporcionado en data.items[' + i + '].iva',
        );
      }
    }

    if (item['iva'] == 10) {
      if (item['ivaTipo'] != 1 && item['ivaTipo'] != 4) {
        this.errors.push(
          '"Iva" = 10 no se admite para "ivaTipo"=' + item['ivaTipo'] + ' proporcionado en data.items[' + i + '].iva',
        );
      }
    }
  }

  /**
   * E8.4. Grupo de rastreo de la mercadería (E750-E760)
   *
   * @param params
   * @param data
   * @param options
   * @param items Es el item actual del array de items de "data" que se está iterando
   */
  private generateDatosItemsOperacionRastreoMercaderiasValidate(params: any, data: any, item: any, i: number) {}

  /**
   * E8.5. Sector de automotores nuevos y usados (E770-E789)
   *
   * @param params
   * @param data
   * @param options
   * @param items Es el item actual del array de items de "data" que se está iterando
   */
  private generateDatosItemsOperacionSectorAutomotoresValidate(params: any, data: any, item: any, i: number) {
    if (!item['sectorAutomotor']) {
      //Como no indica que este campo es obligatorio, si no se informa sale con vacio
      return null;
    }

    if (
      constanteService.tiposOperacionesVehiculos.filter((um) => um.codigo === item['sectorAutomotor']['tipo']).length ==
      0
    ) {
      this.errors.push(
        "Tipo de Operación de Venta de Automotor '" +
          item['sectorAutomotor']['tipo'] +
          "' en data.items[" +
          i +
          '].sectorAutomotor.tipo no encontrado. Valores: ' +
          constanteService.tiposOperacionesVehiculos.map((a) => a.codigo + '-' + a.descripcion),
      );
    }
    if (
      constanteService.tiposCombustibles.filter((um) => um.codigo === item['sectorAutomotor']['tipoCombustible'])
        .length == 0
    ) {
      this.errors.push(
        "Tipo de Combustible '" +
          item['sectorAutomotor']['tipoCombustible'] +
          "' en data.items[" +
          i +
          '].sectorAutomotor.tipoCombustible no encontrado. Valores: ' +
          constanteService.tiposCombustibles.map((a) => a.codigo + '-' + a.descripcion),
      );
    }

    if (item['sectorAutomotor']['chasis']) {
      if (item['sectorAutomotor']['chasis'].length != 17) {
        this.errors.push(
          "El Chassis '" + item['sectorAutomotor']['chasis'] + "' en data.items[" + i + '] debe tener 17 caracteres',
        );
      }
    }

    if (item['sectorAutomotor']['cilindradas']) {
      if ((item['sectorAutomotor']['cilindradas'] + '').length != 4) {
        this.errors.push(
          "La Cilindradas '" +
            item['sectorAutomotor']['cilindradas'] +
            "' en data.items[" +
            i +
            '] debe tener 4 caracteres',
        );
      }
    }
  }
}

export default new JSonDteItemValidateService();
