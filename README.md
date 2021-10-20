# Facturación Electrónica - Generación de XML para la SET (Paraguay)

Módulo NodeJS que genera el **archivo XML** para enviar a la **SET** _(Subsecretaria de Estado de Tributación del Ministerio de Hacienda)_ para el proceso y generación del documento electrónico, a partir de una estructura de datos en formato JSON.

Versión del Manual Técnico: **150**

Este paquete pretende servir de **modelo de transferencia estandarizado** para la **comunicación** con la **SET** contemplando la totalidad de los campos exigidos para cada bloque y tipos de documentos electrónicos.

El mismo es utilizado y mantenido por el autor y otorgado a la comunidad de desarrolladores de forma gratuita bajo licencia **MIT**

El módulo está preparado de forma a proveer una fácil integración dentro de su entorno **NodeJS** y para con cualquier otro lenguaje, sistema o librería que requiera, por ejemplo publicando el médoto desde un REST.

## Características
- Genera el CDC automáticamente de acuerdo a los datos del documento electrónico
- Implementa el Algoritmo del dígito verificador del CDC
- Permite sobreescribir la funcion para calcular el código de seguridad, de acuerdo a las necesidades del usuario
- Realiza la validación del XSD, llamando a una API de Java para emitir el error en la estructura del XML

## Instalación

Para instalar el módulo en su proyecto node, ejecute el siguiente comando:
``` sh
  npm install facturacionelectronicapy-xmlgen
```

El método requiere 2 argumentos tipo **JSON** para general el XML. El primero es un argumento `params` con las informaciones estáticas del Contribuyente emisor, y el segundo es un `data` con los datos variables para cada documento electrónico a generar.

La promesa devuelve el documento XML con los datos generados.

Ejemplo de Uso:

Javascript:
``` js
  const xmlgen = require('facturacionelectronicapy-xmlgen');
  
  xmlgen.generateXMLDE(params, data).then(xml => {
      console.log(xml);
  }).catch(error => {
      console.log(error);
  });     
```

TypeScript:
``` ts
  import xmlgen from 'facturacionelectronicapy-xmlgen';

  xmlgen.generateXMLDE(params, data).then(xml => {
      console.log(xml);
  }).catch(error => {
      console.log(error);
  }); 
```

Ambos parámetros `params` y `data` pueden ser proveidos a partir de una vista de base de datos, leyendo datos de un CSV o proceso generado por otro sistema, para lograr una fácil integración 

Al final podrá encontrar la estructura completa para el PARAMS y el JSON 


## Estructura completa del `params` JSON de Ejemplo
``` json 
{
  "version" : 150,
  "fechaFirmaDigital" : "2021-08-13T00:00:00",
  "ruc" : "80069563-1",
  "razonSocial" : "DE generado en ambiente de prueba - sin valor comercial ni fiscal",
  "nombreFantasia" : "TIPS S.A. TECNOLOGIA Y SERVICIOS",
  "actividadEconomica" : "",  
  "actividadEconomicaDescripcion" : "", 
  "timbradoNumero" : "12558946",
  "timbradoFecha" : "2021-08-25T00:00:00",
  "tipoContribuyente" : 2, 
  "tipoRegimen" : 8, 
  "establecimientos" : [{
    "codigo" : "001",
    "direccion" : "Barrio Carolina", 
    "numeroCasa" : "0", 
    "complementoDireccion1" : "Entre calle 2", 
    "complementoDireccion2" : "y Calle 7",
    "departamento" : 11,
    "departamentoDescripcion" : "ALTO PARANA",
    "distrito" : 145,
    "distritoDescripcion" : "CIUDAD DEL ESTE",
    "ciudad" : 3432,
    "ciudadDescripcion" : "PUERTO PTE.STROESSNER (MUNIC)",
    "telefono" : "0973-527155",
    "email" : "tips@tips.com.py",
    "denominacion" : "Sucursal 1",
  }]
}
```  

## Estructura completa del `data` JSON de Ejemplo
``` json
{
	"tipoDocumento" : 1,
	"ruc" : "80069563-1",
	"establecimiento" : "001",
	"punto" : "001",
	"numero" : "", 
  "descripcion" : "Aparece en el documento",
    "observacion" : "Cualquier informacion de interes",
	"tipoContribuyente" : 1,
	"fecha" : "2020-09-14T10:11:00",
	"tipoEmision" : 1,
    "tipoTransaccion" : 1,
    "tipoImpuesto" : 1,
	"moneda" : "PYG",
    "condicionAnticipo" : 1,
    "condicionTipoCambio": 1,
    "cambio": 6700,
    "cliente" : {
        "contribuyente" : true,
        "ruc" : "2005001-1",
        "razonSocial" : "Marcos Adrian Jara Rodriguez",
        "nombreFantasia" : "Marcos Adrian Jara Rodriguez",
        "tipoOperacion" : 1,
        "direccion" : "Avda Calle Segunda y Proyectada",
        "numeroCasa" : "1515",
        "departamento" : 11,
        "departamentoDescripcion" : "ALTO PARANA",
        "distrito" : 143,
        "distritoDescripcion" : "DOMINGO MARTINEZ DE IRALA",
        "ciudad" : 3344,
        "ciudadDescripcion" : "PASO ITA (INDIGENA)",
        "pais" : "PY",
        "paisDescripcion" : "Paraguay",
        "tipoContribuyente" : 1,
        "documentoTipo" : 1,
        "documentoNumero" : "2324234",
        "telefono" : "xyz",
        "celular" : "xyz",
        "email" : "cliente@cliente.com",
        "codigo" : "1548"
    },
    "usuario" : {
        "documentoTipo" : 1,
        "documentoNumero" : "157264",
        "nombre" : "Marcos Jara",
        "cargo" : "Vendedor"
    },
    "factura" : {
        "presencia" : 1,
        "fechaEnvio" : "2021-10-21",
        "dncp" : {
            "modalidad" : "ABC",
            "entidad" : 1,
            "año" : 2021,
            "secuencia" : 3377,
            "fecha" : "2020-09-14T10:11:00"
        }
    },
    "autoFactura" : {
        "tipoVendedor" : 1,
        "documentoTipo" : 1,
        "documentoNumero" : 1,
        "nombre" : "Vendedor autofactura",
        "direccion" : "Vendedor autofactura",
        "numeroCasa" : "Vendedor autofactura",
        "departamento" : 11,
        "departamentoDescripcion" : "ALTO PARANA",
        "distrito" : 143,
        "distritoDescripcion" : "DOMINGO MARTINEZ DE IRALA",
        "ciudad" : 3344,
        "ciudadDescripcion" : "PASO ITA (INDIGENA)",
        "transaccion" : {
            "lugar" : "Donde se realiza la transaccion",
            "departamento" : 11,
            "departamentoDescripcion" : "ALTO PARANA",
            "distrito" : 143,
            "distritoDescripcion" : "DOMINGO MARTINEZ DE IRALA",
            "ciudad" : 3344,
            "ciudadDescripcion" : "PASO ITA (INDIGENA)"
        }
    },
    "notaCreditoDebito" : {
        "motivo" : 1
    },
    "remision" : {
        "motivo" : 1,
        "tipoResponsable" : 1, 
        "kms" : 150,
        "fechaFactura" : "2021-10-21"
    },
    "condicion" : {
        "tipo" : 1,
        "entregas" : [{ 
            "tipo" : 1,
            "monto" : "150000",
            "moneda" : "PYG",
            "monedaDescripcion" : "Guarani",
            "cambio" : 0
        }, { 
            "tipo" : 3,
            "monto" : "150000",
            "moneda" : "PYG",
            "monedaDescripcion" : "Guarani",
            "cambio" : 0,
            "infoTarjeta" : {
                "tipo" : 1,
                "tipoDescripcion" : "Dinelco",
                "numeroTarjeta": 3232,
                "titular" : "Marcos Jara",
                "ruc" : "6969549654-1",
                "razonSocial" : "Bancard",
                "medioPago" : 1,
                "codigoAutorizacion" : 232524234
            }
        }, { 
            "tipo" : 2,
            "monto" : "150000",
            "moneda" : "PYG",
            "monedaDescripcion" : "Guarani",
            "cambio" : 0,
            "infoCheque" : {
                "numeroCheque": "32323232",
                "banco" : "Sudameris"
            }
        }],
        "credito" : {
            "tipo" : 1,
            "plazo" : "30 días",
            "cuotas" : 2,
            "montoEntrega" : 1500000.00,
            "infoCuotas" : [{
                "moneda" : "PYG",
                "monto" : 800000.00,
                "vencimiento" : "2021-10-30"
            }, {
                "moneda" : "PYG",
                "monto" : 800000.00,
                "vencimiento" : "2021-11-30"
            }]
        }
    },
    "items" : [{
        "codigo" : "A-001",
        "descripcion": "Producto o Servicio", 
        "observacion": "Cualquier informacion de interes", 
        "partidaArancelaria" : 4444,
        "ncm": "ABCD1234",
        "unidadMedida": 77,
        "cantidad": 10.5,
        "precioUnitario": 10800,
        "cambio": 0,
        "descuento": 0,
        "descuentoPorcentaje": 0,
        "anticipo": 0,
        "pais" : "PY",
        "paisDescripcion" : "Paraguay",
        "tolerancia" : 1,
        "toleranciaCantidad" : 1,
        "toleranciaPorcentaje" : 1,
        "cdcAnticipo" : "44digitos",
        "dncp" : {
            "codigoNivelGeneral" : "12345678",
            "codigoNivelEspecifico" : "1234",
            "codigoGtinProducto" : "12345678",
            "codigoNivelPaquete" : "12345678"
        },
        "ivaTipo" : 1,
        "ivaBase" : 30,
        "iva" : 5,
        "lote" : "A-001",
        "vencimiento" : "2022-10-30",
        "numeroSerie" : "",
        "numeroPedido" : "",
        "numeroSeguimiento" : "",
        "importador" : {
            "nombre" : "Importadora Parana S.A.",
            "direccion" : "Importadora Parana S.A.",
            "registroImportador" : "Importadora Parana S.A.",
            "registroSenave" : "Importadora Parana S.A.",
            "registroEntidadComercial" : "Importadora Parana S.A."
        },
        "sectorAutomotor" : {
            "tipo" : 1,
            "chasis" : "4525234523542353245",
            "color" : "Rojo",
            "potencia" : 1500,
            "capacidadMotor" : 5,
            "capacidadPasajeros" : 5,
            "pesoBruto" : 10000,
            "pesoNeto" : 8000,
            "tipoCombustible" : 9,
            "tipoCombustibleDescripcion" : "Vapor",
            "numeroMotor" : "323234234234234234",
            "capacidadTraccion" : 151.01,
            "año" : 2009,
            "tipoVehiculo" : "Camioneta",
            "cilindradas" : "Camioneta"
        }
    }],
    "sectorEnergiaElectrica" : {
        "numeroMedidor" : "132423424235425",
        "codigoActividad" : 125,
        "codigoCategoria" : "001",
        "lecturaAnterior" : 4,
        "lecturaActual" : 5
    },
    "sectorSeguros" : {
        "codigoAseguradora" : "",
        "codigoPoliza" : "AAAA",
        "numeroPoliza" : "BBBB",
        "vigencia" : 1,
        "vigenciaUnidad" : "año",
        "inicioVigencia" : "2021-10-01",
        "finVigencia" : "2022-10-01",
        "codigoInternoItem" : "A-001"
    },
    "sectorSupermercados" : {
        "nombreCajero" : "Juan Antonio Caceres",
        "efectivo" : 150000,
        "vuelto" : 30000,
        "donacion" : 1000,
        "donacionDescripcion" : "Donado para la caridad"
    },
    "sectorAdicional" : {
        "ciclo" : "Mensualidad Pago",
        "inicioCiclo" : "2021-09-01",
        "finCiclo" : "2021-10-01",
        "vencimientoPago" : "2021-11-01",
        "numeroContrato" : "AF-2541",
        "saldoAnterior" : 1550000
    },
    "detalleTransporte" : {
        "tipo" : 1,
        "modalidad" : 1,
        "tipoResponsable" : 1,
        "condicionNegociacion" : "ABC",
        "numeroManifiesto" : "AF-2541",
        "numeroDespachoImportacion" : "153223232332",
        "inicioEstimadoTranslado" : "2021-11-01",
        "finEstimadoTranslado" : "2021-11-01",
        "paisDestino" : "PY", 
        "paisDestinoNombre" : "Paraguay",
        "salida" : {
            "direccion" : "Paraguay",
            "numeroCasa" : "Paraguay",
            "complementoDireccion1" : "Entre calle 2", 
            "complementoDireccion2" : "y Calle 7",
            "departamento" : 11,
            "departamentoDescripcion" : "ALTO PARANA",
            "distrito" : 143,
            "distritoDescripcion" : "DOMINGO MARTINEZ DE IRALA",
            "ciudad" : 3344,
            "ciudadDescripcion" : "PASO ITA (INDIGENA)",
            "pais" : "PY",
            "paisDescripcion" : "Paraguay",
            "telefonoContacto" : "097x"
        },
        "entrega" : {
            "direccion" : "Paraguay",
            "numeroCasa" : "Paraguay",
            "complementoDireccion1" : "Entre calle 2", 
            "complementoDireccion2" : "y Calle 7",
            "departamento" : 11,
            "departamentoDescripcion" : "ALTO PARANA",
            "distrito" : 143,
            "distritoDescripcion" : "DOMINGO MARTINEZ DE IRALA",
            "ciudad" : 3344,
            "ciudadDescripcion" : "PASO ITA (INDIGENA)",
            "pais" : "PY",
            "paisDescripcion" : "Paraguay",
            "telefonoContacto" : "097x"
        },
        "vehiculo" : {
            "tipo" : 1,
            "marca" : "Nissan",
            "documentoTipo" : 1, 
            "documentoNumero" : "232323-1",
            "obs" : "",
            "numeroMatricula" : "ALTO PARANA",
            "numeroVuelo" : 143
        },
        "transportista" : {
            "contribuyente" : true,
            "nombre" : "Paraguay",
            "ruc" : "Entre calle 2", 
            "documentoTipo" : 1,
            "documentoNumero" : "y Calle 7",
            "direccion" : "y Calle 7",
            "obs" : 11,
            "pais" : "PY",
            "paisDescripcion" : "Paraguay",
            "chofer" : {
                "documentoNumero" : "",
                "nombre" : "Jose Benitez",
                "direccion" : "Jose Benitez"
            },
            "agente" : {
                "nombre" : "Jose Benitez",
                "ruc" : "Jose Benitez",
                "direccion" : "Jose Benitez"
            }
        }
    },
    "complementarios" : {
        "ordenCompra" : "",
        "ordenVenta" : "",
        "numeroAsiento" : "",
        "carga" : {
            "ordenCompra" : "",
            "ordenVenta" : "",
            "numeroAsiento" : ""
        }
    },
    "documentoAsociado" : {
        "formato" : 1,
        "cdc" : "44digitos",
        "tipo" : 1,
        "timbrado" : "32323",
        "establecimiento" : "001",
        "punto" : "001",
        "numero" : "00278211",
        "fecha" : "2020-09-14",
        "numeroRetencion" : "32323232",
        "resolucionCreditoFiscal" : "32323",
        "constanciaTipo" : 1,
        "constanciaNumero" : 32323,
        "constanciaControl" : "33232323"

    }
}
```
## Serie Técnica sobre Facturación Electrónica - YouTube

Para más información sobre el proceso que llevó a la generación de éste módulo visite la lista de reproducción "Serie técnica sobre Facturación Electrónica" en el canal de youtube del autor  https://www.youtube.com/channel/UC05xmdC5i3Ob7XnYbQDiBTQ

* * *

Todos los derechos reservados - 2021