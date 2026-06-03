# LOGFOOD CORE SERVICE

## Contexto

Este repositorio concentra el dominio de negocio de LogFood sobre la base de datos `core_db`.

### Objetivo principal

Gestionar integralmente la operación gastronómica con foco en:

- reducción de desperdicios
- control de inventario
- optimización de compras
- análisis de rentabilidad

## Principios de arquitectura

- Domain Driven Design
- Clean Architecture
- SOLID
- Event Driven Design cuando aporte valor

Las implementaciones deben diseñarse con evolución hacia microservicios independientes.

## Módulos de negocio

- Inventory
- Products
- Categories
- Suppliers
- Purchases
- Recipes
- Sales
- Waste
- Reports
- Dashboard

### Inventory

- stock
- movimientos
- ajustes
- alertas

### Sales

- ventas
- descuentos automáticos de stock
- consumo de recetas

### Recipes

- fichas técnicas
- ingredientes
- cantidades

### Suppliers

- proveedores
- historial de precios
- compras

## Auditoría

Toda operación crítica debe ser auditable y registrar:

- usuario
- fecha
- acción
- entidad afectada