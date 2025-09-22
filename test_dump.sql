--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Homebrew)
-- Dumped by pg_dump version 14.18 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: clientes; Type: TABLE DATA; Schema: clinical; Owner: postgres
--

INSERT INTO clinical.clientes VALUES ('46b889c7-d434-4653-94aa-8afe597b2a9e', 'Juan Pérez', NULL, 'Calle 123', '555-1234', 'juan@example.com', NULL, NULL, true, '2025-07-22 13:10:34.641926', '2025-07-22 13:10:34.641926', NULL);
INSERT INTO clinical.clientes VALUES ('a3cf6a46-197b-4b36-9598-00d54c022113', 'María García', '12345678', 'Calle 123 #45-67, Bogotá', '3001234567', 'maria.garcia@example.com', NULL, NULL, true, '2025-07-22 18:49:57.122467', '2025-07-22 18:49:57.122467', NULL);
INSERT INTO clinical.clientes VALUES ('e3035062-aeb0-44cc-8c46-b7780aedeeaa', 'Carlos Rodríguez', '87654321', 'Carrera 45 #12-34, Medellín', '3159876543', 'carlos.rodriguez@example.com', NULL, 'Cliente VIP - descuento 10%', true, '2025-07-22 18:51:19.445024', '2025-07-22 18:51:19.445024', NULL);
INSERT INTO clinical.clientes VALUES ('df6a46d1-cc0d-4ae5-a4a4-a6b4eea50b4c', 'Ana María González', '52987654', 'Calle 85 #15-30', '3005559876', 'ana.gonzalez@email.com', '1985-05-15', NULL, true, '2025-07-22 20:06:20.743146', '2025-07-22 20:06:20.743146', NULL);
INSERT INTO clinical.clientes VALUES ('bb56cbdd-f2a9-43ab-ad46-b72880579e5d', 'Juan Perez', NULL, NULL, '123456789', 'juan@test.com', NULL, NULL, true, '2025-08-01 20:34:48.86339', '2025-08-01 20:34:48.86339', NULL);
INSERT INTO clinical.clientes VALUES ('e8504adb-a6c1-4497-87de-b40acbfcc608', 'Juan Perez', '0987654', NULL, '123456789', 'juan@test.com', NULL, NULL, true, '2025-08-01 20:35:10.393366', '2025-08-12 12:50:33.084215', NULL);
INSERT INTO clinical.clientes VALUES ('7ca0ff53-1693-49db-ba11-0515e6a5fe15', 'Juliana Jimenez', '30399617', NULL, '311660600', 'julianajimenez817@hotmail.com', NULL, NULL, true, '2025-07-28 13:17:21.447848', '2025-08-14 18:31:41.234795', NULL);
INSERT INTO clinical.clientes VALUES ('955efa64-eee8-4d6b-9e6f-5934ce9ba475', 'cesar jimenez', '75100663', 'cale 69 # 28 c 55', '3104618307', 'cjimenez0202@gmail.com', NULL, NULL, true, '2025-08-14 13:03:36.63787', '2025-08-14 18:33:06.280375', NULL);
INSERT INTO clinical.clientes VALUES ('21176cd5-7e32-4c15-815b-b8917617f778', 'Diego Sanchez', '1054988359', 'calle 69 28c55', '3052621653', 'rikyd2010@hotmail.com', NULL, NULL, true, '2025-07-26 18:31:42.285952', '2025-08-14 19:23:27.779422', NULL);
INSERT INTO clinical.clientes VALUES ('770eda86-f13a-4e87-a124-800bd5a68360', 'Test Cliente', NULL, NULL, '123456789', NULL, NULL, NULL, true, '2025-08-01 20:44:47.247808', '2025-08-14 19:24:27.880743', NULL);


--
-- Data for Name: mascotas; Type: TABLE DATA; Schema: clinical; Owner: postgres
--

INSERT INTO clinical.mascotas VALUES ('0ea2fae5-0065-489b-84fe-24290a924476', 'a3cf6a46-197b-4b36-9598-00d54c022113', 'Test', 'Perro', NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, true, '2025-07-22 19:16:04.114527', '2025-07-22 19:16:04.114527', NULL);
INSERT INTO clinical.mascotas VALUES ('479b06e2-5f26-42a7-94ed-15c7b0fdff84', 'a3cf6a46-197b-4b36-9598-00d54c022113', 'Test Direct', 'Perro', NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, true, '2025-07-22 19:22:39.43412', '2025-07-22 19:22:39.43412', NULL);
INSERT INTO clinical.mascotas VALUES ('a353538f-4e3c-4dbc-80e6-5310c566a954', 'a3cf6a46-197b-4b36-9598-00d54c022113', 'Test Pet', 'Perro', NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, true, '2025-07-22 19:30:10.516225', '2025-07-22 19:30:10.516225', NULL);
INSERT INTO clinical.mascotas VALUES ('e1d0cd75-821a-4e43-9ca1-42c6346ce3e4', 'a3cf6a46-197b-4b36-9598-00d54c022113', 'Luna', 'Gato', 'Persa', 18, 'Hembra', 4.20, 'Blanco', '2023-07-01', true, 'DEF987654321', NULL, NULL, true, '2025-07-22 19:39:38.132196', '2025-07-22 19:39:38.132196', NULL);
INSERT INTO clinical.mascotas VALUES ('db9c84a3-b694-4330-8f5e-f5f991e57e31', 'e3035062-aeb0-44cc-8c46-b7780aedeeaa', 'Luna Mejorada', 'Perro', 'Golden Retriever', 5, 'Hembra', 22.50, 'Dorado', '2020-03-14', true, '987654321XYZ', NULL, NULL, true, '2025-07-22 19:58:59.320036', '2025-07-22 19:58:59.320036', NULL);
INSERT INTO clinical.mascotas VALUES ('e6e11b51-620d-43bb-af15-f73408dddaa3', 'df6a46d1-cc0d-4ae5-a4a4-a6b4eea50b4c', 'Princesa', 'Gato', 'Persa', 6, 'Hembra', 4.20, 'Blanco', '2019-03-09', true, 'PRS123456789', NULL, NULL, true, '2025-07-22 20:06:36.618326', '2025-07-22 20:06:36.618326', NULL);
INSERT INTO clinical.mascotas VALUES ('ca847547-6153-48dd-b0d4-1dc5b938821a', 'df6a46d1-cc0d-4ae5-a4a4-a6b4eea50b4c', 'Rocky Cachorro', 'Perro', 'Labrador', 0, 'Macho', 8.50, 'Chocolate', '2024-10-14', false, 'PUPPY123456789', NULL, NULL, true, '2025-07-22 20:13:41.564594', '2025-07-22 20:13:41.564594', NULL);
INSERT INTO clinical.mascotas VALUES ('ad983cd2-79a6-4355-9fe1-eef351409c33', '770eda86-f13a-4e87-a124-800bd5a68360', 'Test Mascota', 'Perro', NULL, NULL, 'Macho', NULL, NULL, NULL, false, NULL, NULL, '/uploads/pacientes/mascota-ad983cd2-79a6-4355-9fe1-eef351409c33-1755217467928.jpeg', true, '2025-08-01 20:44:47.247808', '2025-08-14 19:24:27.93052', NULL);
INSERT INTO clinical.mascotas VALUES ('fc7eb1dc-7a39-40cd-8b2a-b647f4340d61', '46b889c7-d434-4653-94aa-8afe597b2a9e', 'Firulais', 'Perro', 'Labrador', NULL, 'Macho', 25.50, 'Dorado', '2020-01-15', false, NULL, NULL, NULL, true, '2025-07-22 13:10:34.641926', '2025-07-26 19:32:43.304373', NULL);
INSERT INTO clinical.mascotas VALUES ('652880fc-5b8d-4150-b54f-75afaf7d1048', '7ca0ff53-1693-49db-ba11-0515e6a5fe15', 'luna', 'Hamster', 'Ruso', 0, 'Hembra', 0.20, 'marron', '2025-05-01', false, NULL, 'lunita esposa de mini benji', NULL, true, '2025-07-28 13:17:21.447848', '2025-08-14 18:31:41.234795', NULL);
INSERT INTO clinical.mascotas VALUES ('019c9f0e-3d1e-4b61-b4af-b441768de067', 'a3cf6a46-197b-4b36-9598-00d54c022113', 'Mochi', 'Gato', 'Siamés', 12, 'Hembra', 3.80, 'Crema', '2024-01-01', true, 'GHI345678901', NULL, NULL, true, '2025-07-22 19:43:55.285073', '2025-07-26 19:44:36.09615', NULL);
INSERT INTO clinical.mascotas VALUES ('45075ef9-5848-4d18-9d13-e5a173d1c3a8', '955efa64-eee8-4d6b-9e6f-5934ce9ba475', 'king jimenez', 'Gato', 'Mestizo', 3, 'Macho', 4.00, 'gris', '2022-01-29', false, 'no', 'el rey de la casa', NULL, true, '2025-08-14 13:03:36.63787', '2025-08-14 19:28:21.915803', NULL);
INSERT INTO clinical.mascotas VALUES ('53357b79-03e6-48df-b1d8-ab3d2bbd769b', '7ca0ff53-1693-49db-ba11-0515e6a5fe15', 'pantera', 'Pez', 'Otro', NULL, 'Macho', NULL, 'negro', NULL, false, NULL, 'Bagre, tigrillo', NULL, true, '2025-08-12 12:52:36.082658', '2025-09-01 19:07:25.263831', NULL);
INSERT INTO clinical.mascotas VALUES ('ca240981-2fa8-43ca-8160-bc82e003d0d9', 'a3cf6a46-197b-4b36-9598-00d54c022113', 'Rex', 'Perro', NULL, NULL, 'Macho', NULL, NULL, NULL, false, NULL, NULL, NULL, true, '2025-08-01 20:37:44.374966', '2025-09-01 20:33:14.263685', NULL);
INSERT INTO clinical.mascotas VALUES ('24e8a50c-912d-4749-bf85-4d01adb8ef46', 'bb56cbdd-f2a9-43ab-ad46-b72880579e5d', 'Firulais', 'Perro', NULL, NULL, 'Macho', NULL, NULL, NULL, false, NULL, NULL, NULL, true, '2025-08-01 20:34:48.86339', '2025-08-01 20:34:48.86339', NULL);
INSERT INTO clinical.mascotas VALUES ('c8ece1d9-d7db-4f38-b88a-ec9673c2f70d', '21176cd5-7e32-4c15-815b-b8917617f778', 'candela', 'Otro', 'Otro', 0, 'Hembra', NULL, 'negro - rojo', '2025-06-01', false, NULL, 'hormiga', '/uploads/pacientes/mascota-c8ece1d9-d7db-4f38-b88a-ec9673c2f70d-1755215795041.jpeg', true, '2025-08-01 20:54:44.690708', '2025-08-14 18:56:35.046761', NULL);
INSERT INTO clinical.mascotas VALUES ('17983ad0-c6ea-40c4-93f3-32cf18cda6e2', 'e8504adb-a6c1-4497-87de-b40acbfcc608', 'Garfield', 'Gato', 'Maine Coon', 1, 'Macho', 1.50, 'amarillo', '2024-06-10', false, NULL, NULL, NULL, true, '2025-08-01 20:35:10.393366', '2025-08-12 12:50:33.084215', NULL);
INSERT INTO clinical.mascotas VALUES ('a1556b25-32b1-4040-9bcc-65a3fe7e82c6', '21176cd5-7e32-4c15-815b-b8917617f778', 'shiny', 'Ave', 'Cacatúa', 0, 'Hembra', 0.20, 'blanco amarillo', '2025-04-07', false, NULL, NULL, NULL, true, '2025-08-12 12:51:39.377555', '2025-08-12 12:51:39.377555', NULL);
INSERT INTO clinical.mascotas VALUES ('57832cc9-0546-4f62-93c6-35f2da88543a', 'df6a46d1-cc0d-4ae5-a4a4-a6b4eea50b4c', 'Bella Baby', 'Gato', 'Siamés', 0, 'Hembra', 1.20, 'Crema', '2025-04-30', false, '', NULL, NULL, true, '2025-07-22 20:14:02.416229', '2025-08-12 12:55:39.2851', NULL);
INSERT INTO clinical.mascotas VALUES ('fdab6850-337a-4b01-910c-1424e4bd9e0c', '21176cd5-7e32-4c15-815b-b8917617f778', 'bombom', 'Perro', 'Mestizo', 1, 'Hembra', 12.00, 'dorado', '2024-08-01', false, NULL, 'la bironcha', '/uploads/pacientes/mascota-fdab6850-337a-4b01-910c-1424e4bd9e0c-1755217230890.jpeg', true, '2025-07-26 18:31:42.285952', '2025-08-14 19:20:30.894333', NULL);
INSERT INTO clinical.mascotas VALUES ('b9be9992-6c5d-488d-8994-c2d461b13c9d', '21176cd5-7e32-4c15-815b-b8917617f778', 'candela', 'Otro', 'Otro', 0, 'Hembra', NULL, 'negro - rojo', '2025-06-01', false, NULL, 'Hormiga', '/uploads/pacientes/mascota-b9be9992-6c5d-488d-8994-c2d461b13c9d-1755217407824.jpeg', true, '2025-08-01 20:57:01.908371', '2025-08-14 19:23:27.83342', NULL);


--
-- Data for Name: consultas_clinicas; Type: TABLE DATA; Schema: clinical; Owner: postgres
--

INSERT INTO clinical.consultas_clinicas VALUES ('76c12acf-e5a2-45b6-b399-6a49dbfdcab8', 'CON-97227231', 'fdab6850-337a-4b01-910c-1424e4bd9e0c', '612b7d82-bf59-489a-8e1b-97c7dad91717', '2025-09-13 16:00:27.201603', 'Fiebre despues de vacuna', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'En Curso', NULL, '2025-09-13 16:00:27.201603', '2025-09-13 16:00:27.201603', false, NULL, NULL);
INSERT INTO clinical.consultas_clinicas VALUES ('02bf17fa-71e3-4352-82ed-80eb0fc13394', 'CON-08036548', 'b9be9992-6c5d-488d-8994-c2d461b13c9d', 'fc6a9e30-0796-47d8-904d-ef2f1eaa0b20', '2025-09-13 19:00:36.420004', 'Consulta programada', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'En Curso', NULL, '2025-09-13 19:00:36.420004', '2025-09-13 19:00:36.420004', false, NULL, NULL);
INSERT INTO clinical.consultas_clinicas VALUES ('f718e110-3bd3-4490-9cde-c87e87babb7b', 'CON-04178431', 'fdab6850-337a-4b01-910c-1424e4bd9e0c', 'fc6a9e30-0796-47d8-904d-ef2f1eaa0b20', '2025-09-13 17:56:18.393944', 'sigue enferma', NULL, NULL, 30.00, 30.00, 'fiebre postvacuna', 'medicamento segun formula', '[]', NULL, '2025-09-22', 'Completada', NULL, '2025-09-13 17:56:18.393944', '2025-09-13 20:41:46.276611', false, NULL, NULL);


--
-- Data for Name: calendario_citas; Type: TABLE DATA; Schema: clinical; Owner: postgres
--

INSERT INTO clinical.calendario_citas VALUES ('ec4e5c0b-b045-4b97-818e-11fcba6bbd36', 'GCL-82156144', '652880fc-5b8d-4150-b54f-75afaf7d1048', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'consulta_general', 'pendiente', 'Consulta de prueba - Verificación webhook Google Calendar', 'Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus

🐕 Mascota: luna
👤 Cliente: Juliana Jimenez
👨‍⚕️ Veterinario: maria fernanda
📋 Tipo: consulta_general
📝 Motivo: Consulta de prueba - Verificación webhook Google Calendar

Código de cita: CIT-71979218', false, NULL, 'h12h82q0ane1822l2c8r1pggv8', '2025-09-13 11:49:16.144504', '2025-09-13 11:49:16.347687', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'synced', NULL, '2025-09-13 11:49:16.347687-05', '2025-09-15 09:00:00', '2025-09-15 10:00:00');
INSERT INTO clinical.calendario_citas VALUES ('eb7c64e6-d4af-40db-8462-d07c92dd4650', 'GCL-82259595', 'c8ece1d9-d7db-4f38-b88a-ec9673c2f70d', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'consulta_general', 'pendiente', 'No especificado', 'Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus

🐕 Mascota: candela
👤 Cliente: Diego Sanchez
👨‍⚕️ Veterinario: Juan Veterinario
📋 Tipo: consulta_general
📝 Motivo: No especificado

Código de cita: CIT-01022074', false, NULL, 'e6ef8muaehju5omin66b4qn4p4', '2025-09-13 11:50:59.595706', '2025-09-13 11:50:59.595706', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'synced', NULL, NULL, '2025-08-02 13:00:00', '2025-08-02 13:30:00');
INSERT INTO clinical.calendario_citas VALUES ('7adc1477-883d-46a8-b406-582ed324ca92', 'GCL-82259603', 'ca240981-2fa8-43ca-8160-bc82e003d0d9', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'vacunacion', 'pendiente', 'No especificado', 'Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus

🐕 Mascota: Rex
👤 Cliente: María García
👨‍⚕️ Veterinario: Juan Veterinario
📋 Tipo: vacunacion
📝 Motivo: No especificado

Código de cita: CIT-02687381', false, NULL, '1n03frl1s2imlqens7r0h7s1c8', '2025-09-13 11:50:59.604177', '2025-09-13 11:50:59.604177', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'synced', NULL, NULL, '2025-08-09 04:00:00', '2025-08-09 04:15:00');
INSERT INTO clinical.calendario_citas VALUES ('585dcdb4-63b5-4cbe-9d88-51a6c94c8fe4', 'GCL-82259611', '53357b79-03e6-48df-b1d8-ab3d2bbd769b', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'consulta_general', 'pendiente', 'revision', 'Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus

🐕 Mascota: pantera
👤 Cliente: Juliana Jimenez
👨‍⚕️ Veterinario: maria fernanda
📋 Tipo: consulta_general
📝 Motivo: revision

Código de cita: CIT-22573058', false, NULL, 'qknrbp88jsm4m6jnpcrc9pvbos', '2025-09-13 11:50:59.611835', '2025-09-13 11:50:59.611835', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'synced', NULL, NULL, '2025-08-12 22:00:00', '2025-08-12 22:30:00');
INSERT INTO clinical.calendario_citas VALUES ('4eee745d-f53c-498a-83e3-7956adff9a5c', 'GCL-82259616', 'c8ece1d9-d7db-4f38-b88a-ec9673c2f70d', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'consulta_general', 'pendiente', 'hormiga', 'Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus

🐕 Mascota: candela
👤 Cliente: Diego Sanchez
👨‍⚕️ Veterinario: Juan Veterinario
📋 Tipo: consulta_general
📝 Motivo: hormiga

Código de cita: CIT-41643517', false, NULL, 'ql8pk7vkas25hlalpjp749dl4k', '2025-09-13 11:50:59.616565', '2025-09-13 11:50:59.616565', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'synced', NULL, NULL, '2025-08-13 08:00:00', '2025-08-13 08:30:00');
INSERT INTO clinical.calendario_citas VALUES ('24ffdfda-e022-4d44-afad-1436fa599fe9', 'GCL-82259621', 'a1556b25-32b1-4040-9bcc-65a3fe7e82c6', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'revision', 'pendiente', 'Encuentro con un perro, sangrado en ala.', 'Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus

🐕 Mascota: shiny
👤 Cliente: Diego Sanchez
👨‍⚕️ Veterinario: maria fernanda
📋 Tipo: revision
📝 Motivo: Encuentro con un perro, sangrado en ala.

Código de cita: CIT-41598184', false, NULL, 'vop0mtatobs5489uc7e6rg98os', '2025-09-13 11:50:59.62173', '2025-09-13 11:50:59.62173', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'synced', NULL, NULL, '2025-08-13 09:00:00', '2025-08-13 09:45:00');
INSERT INTO clinical.calendario_citas VALUES ('a81f5704-bdaf-4233-ab16-841846559bbc', 'GCL-82259628', 'c8ece1d9-d7db-4f38-b88a-ec9673c2f70d', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'consulta_general', 'pendiente', 'Hormiga no come', 'Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus

🐕 Mascota: candela
👤 Cliente: Diego Sanchez
👨‍⚕️ Veterinario: maria fernanda
📋 Tipo: consulta_general
📝 Motivo: Hormiga no come

Código de cita: CIT-44945719', false, NULL, '6ki2tvli9mg6q550lfnecj6dlk', '2025-09-13 11:50:59.628798', '2025-09-13 11:50:59.628798', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'synced', NULL, NULL, '2025-08-13 11:00:00', '2025-08-13 11:30:00');
INSERT INTO clinical.calendario_citas VALUES ('e83b67f3-41bf-41ee-bbb3-f0f8cf798106', 'GCL-82259636', '652880fc-5b8d-4150-b54f-75afaf7d1048', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'otro', 'pendiente', 'Poner a Luna a dieta', 'Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus

🐕 Mascota: luna
👤 Cliente: Juliana Jimenez
👨‍⚕️ Veterinario: maria fernanda
📋 Tipo: otro
📝 Motivo: Poner a Luna a dieta

Código de cita: CIT-07978489', false, NULL, '84hde1sj4th52ci8dmjujniaq4', '2025-09-13 11:50:59.636318', '2025-09-13 11:50:59.636318', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'synced', NULL, NULL, '2025-08-14 08:00:00', '2025-08-14 08:30:00');
INSERT INTO clinical.calendario_citas VALUES ('e6516b6d-5f63-4eeb-953f-16307d591b20', 'GCL-82259640', 'a1556b25-32b1-4040-9bcc-65a3fe7e82c6', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'control', 'pendiente', 'No especificado', 'Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus

🐕 Mascota: shiny
👤 Cliente: Diego Sanchez
👨‍⚕️ Veterinario: Juan Veterinario
📋 Tipo: control
📝 Motivo: No especificado

Código de cita: CIT-08352919', false, NULL, 'd0sfa8u0c7thci8acenp8v1gbo', '2025-09-13 11:50:59.641256', '2025-09-13 11:50:59.641256', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'synced', NULL, NULL, '2025-08-14 08:00:00', '2025-08-14 08:20:00');
INSERT INTO clinical.calendario_citas VALUES ('13ed58d2-d0f0-47f8-8b89-67c66cf4ccc4', 'GCL-82259644', '45075ef9-5848-4d18-9d13-e5a173d1c3a8', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'consulta_general', 'pendiente', 'lesion lumbosacra', 'Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus

🐕 Mascota: king jimenez
👤 Cliente: cesar jimenez
👨‍⚕️ Veterinario: maria fernanda
📋 Tipo: consulta_general
📝 Motivo: lesion lumbosacra

Código de cita: CIT-94747258', false, NULL, 'i97htfgvb9gmep7684mbdt1n58', '2025-09-13 11:50:59.644756', '2025-09-13 11:50:59.644756', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'synced', NULL, NULL, '2025-08-14 17:00:00', '2025-08-14 17:30:00');
INSERT INTO clinical.calendario_citas VALUES ('d4f6d2e8-b48a-42a9-8f18-bd4429a19e50', 'GCL-82259649', 'fdab6850-337a-4b01-910c-1424e4bd9e0c', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'vacunacion', 'pendiente', 'vacuna periodica', 'Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus

🐕 Mascota: bombom
👤 Cliente: Diego Sanchez
👨‍⚕️ Veterinario: maria fernanda
📋 Tipo: vacunacion
📝 Motivo: vacuna periodica

Código de cita: CIT-20894211', false, NULL, 'v63qvdpn3dk1s3le29u4qlp0i8', '2025-09-13 11:50:59.649156', '2025-09-13 11:50:59.649156', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'synced', NULL, NULL, '2025-08-16 08:00:00', '2025-08-16 08:15:00');
INSERT INTO clinical.calendario_citas VALUES ('fa57a0bb-4426-4ef2-aaed-4b8413027d37', 'GCL-82259652', 'c8ece1d9-d7db-4f38-b88a-ec9673c2f70d', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'consulta_general', 'pendiente', 'revision', 'Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus

🐕 Mascota: candela
👤 Cliente: Diego Sanchez
👨‍⚕️ Veterinario: maria fernanda
📋 Tipo: consulta_general
📝 Motivo: revision

Código de cita: CIT-43085616', false, NULL, 'a2s8mngee1kkpsbhl2l1tpt1mg', '2025-09-13 11:50:59.653129', '2025-09-13 11:50:59.653129', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'synced', NULL, NULL, '2025-08-17 11:00:00', '2025-08-17 11:30:00');
INSERT INTO clinical.calendario_citas VALUES ('d6f59f2f-606f-49b2-8088-f5c3ee50b2b5', 'GCL-82259656', '53357b79-03e6-48df-b1d8-ab3d2bbd769b', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'consulta_general', 'pendiente', 'No especificado', 'Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus

🐕 Mascota: pantera
👤 Cliente: Juliana Jimenez
👨‍⚕️ Veterinario: Juan Veterinario
📋 Tipo: consulta_general
📝 Motivo: No especificado

Código de cita: CIT-52742460', false, NULL, 'j4bibffvn1d1djqkc7ge5a4ufk', '2025-09-13 11:50:59.656947', '2025-09-13 11:50:59.656947', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'synced', NULL, NULL, '2025-08-17 11:30:00', '2025-08-17 12:00:00');
INSERT INTO clinical.calendario_citas VALUES ('c250b1d1-78a8-470c-83a0-8ca055b5d502', 'GCL-82259661', 'a1556b25-32b1-4040-9bcc-65a3fe7e82c6', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'consulta_general', 'pendiente', 'revision', 'Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus

🐕 Mascota: shiny
👤 Cliente: Diego Sanchez
👨‍⚕️ Veterinario: maria fernanda
📋 Tipo: consulta_general
📝 Motivo: revision

Código de cita: CIT-46277333', false, NULL, 'rtodv0buah8f0s26fgq59pii44', '2025-09-13 11:50:59.661339', '2025-09-13 11:50:59.661339', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'synced', NULL, NULL, '2025-08-19 03:00:00', '2025-08-19 03:45:00');
INSERT INTO clinical.calendario_citas VALUES ('609f02f2-2865-4c32-9463-a563f64fedef', 'GCL-82259665', 'a1556b25-32b1-4040-9bcc-65a3fe7e82c6', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'consulta_general', 'pendiente', 'No especificado', 'Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus

🐕 Mascota: shiny
👤 Cliente: Diego Sanchez
👨‍⚕️ Veterinario: maria fernanda
📋 Tipo: consulta_general
📝 Motivo: No especificado

Código de cita: CIT-85485915', false, NULL, 'ifgneqsvbc0grrlso631ls1udo', '2025-09-13 11:50:59.666331', '2025-09-13 11:50:59.666331', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'synced', NULL, NULL, '2025-08-22 12:30:00', '2025-08-22 13:00:00');
INSERT INTO clinical.calendario_citas VALUES ('1b650e61-f5d7-4798-aa4a-fcbf6cc46caf', 'GCL-82259670', 'a1556b25-32b1-4040-9bcc-65a3fe7e82c6', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'vacunacion', 'pendiente', 'No especificado', 'Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus

🐕 Mascota: shiny
👤 Cliente: Diego Sanchez
👨‍⚕️ Veterinario: Juan Carlos
📋 Tipo: vacunacion
📝 Motivo: No especificado

Código de cita: CIT-58165253', false, NULL, '41nvrbqrrgnh2tvhic667h00b0', '2025-09-13 11:50:59.670193', '2025-09-13 11:50:59.670193', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'synced', NULL, NULL, '2025-08-27 03:00:00', '2025-08-27 03:30:00');
INSERT INTO clinical.calendario_citas VALUES ('7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9', 'CIT-85533697', 'fdab6850-337a-4b01-910c-1424e4bd9e0c', 'fc6a9e30-0796-47d8-904d-ef2f1eaa0b20', 'control', 'cancelada', 'otro control', '  | Cliente confirmó asistencia desde Google Calendar  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cliente canceló desde Google Calendar', false, NULL, '1ej8dr0ac88oidc77gdc6plsgc', '2025-09-13 12:45:33.702814', '2025-09-13 16:10:52.734291', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', 'synced', NULL, '2025-09-13 12:45:34.237915-05', '2025-09-13 16:00:00', '2025-09-13 16:20:00');
INSERT INTO clinical.calendario_citas VALUES ('d06f3df6-ec60-4769-b54c-56cdf59bc805', 'GCL-82156117', 'a1556b25-32b1-4040-9bcc-65a3fe7e82c6', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'vacunacion', 'cancelada', 'dgfhdjf', 'Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus

🐕 Mascota: shiny
👤 Cliente: Diego Sanchez
👨‍⚕️ Veterinario: Juan Carlos
📋 Tipo: vacunacion
📝 Motivo: dgfhdjf

Código de cita: CIT-76997372  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.  | Cliente canceló desde Google Calendar Cita oculta del calendario.', false, NULL, 'bllva7mjfaib7kri4d1qbqspl4', '2025-09-13 11:49:16.117785', '2025-09-13 16:10:52.734291', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'synced', NULL, '2025-09-13 13:01:42.548165-05', '2025-09-13 16:00:00', '2025-09-13 16:30:00');
INSERT INTO clinical.calendario_citas VALUES ('b6849a37-61fd-495c-aded-20d036a264dd', 'GCL-82859815', 'fdab6850-337a-4b01-910c-1424e4bd9e0c', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'vacunacion', 'cancelada', 'Vacuna antirabica', 'Importado desde Google Calendar. 📅 Cita Veterinaria - VetPlus

🐕 Mascota: bombom
👤 Cliente: Diego Sanchez
👨‍⚕️ Veterinario: Juan Carlos
📋 Tipo: vacunacion
📝 Motivo: Vacuna antirabica

Código de cita: GCL-82156134 | Cliente canceló desde Google Calendar', false, NULL, 'liciivg43iuib88mnnf6u6enjo', '2025-09-13 12:00:59.815917', '2025-09-13 16:55:22.526733', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'synced', NULL, '2025-09-13 12:01:00.011106-05', '2025-09-13 11:00:00', '2025-09-13 11:15:00');
INSERT INTO clinical.calendario_citas VALUES ('5fe72af3-ac2d-47c9-bf8c-17233329e742', 'CIT-82924801', 'fdab6850-337a-4b01-910c-1424e4bd9e0c', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'control', 'en_curso', 'Fiebre despues de vacuna', NULL, false, '76c12acf-e5a2-45b6-b399-6a49dbfdcab8', 'b8rn8cmatm4al4e6j9ertr7a6s', '2025-09-13 12:02:04.805901', '2025-09-13 16:00:27.201603', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', 'synced', NULL, '2025-09-13 12:09:24.163382-05', '2025-09-13 14:30:00', '2025-09-13 14:50:00');
INSERT INTO clinical.calendario_citas VALUES ('6d3668a5-160a-464f-97ae-5e1bc225cdd8', 'CIT-97490149', 'fdab6850-337a-4b01-910c-1424e4bd9e0c', 'fc6a9e30-0796-47d8-904d-ef2f1eaa0b20', 'emergencia', 'cancelada', 'Urgencia', ' | Cliente canceló desde Google Calendar | Cliente confirmó asistencia desde Google Calendar | Cliente marcó como tentativo desde Google Calendar', false, NULL, NULL, '2025-09-13 16:04:50.155692', '2025-09-13 16:53:45.113836', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', 'synced', NULL, '2025-09-13 16:53:45.113836-05', '2025-09-13 19:00:00', '2025-09-13 19:45:00');
INSERT INTO clinical.calendario_citas VALUES ('93748851-5028-4b86-9ac4-6ea615738bf6', 'CIT-00665440', 'b9be9992-6c5d-488d-8994-c2d461b13c9d', 'fc6a9e30-0796-47d8-904d-ef2f1eaa0b20', 'vacunacion', 'en_curso', NULL, 'Cliente confirmó asistencia desde Google Calendar', false, '02bf17fa-71e3-4352-82ed-80eb0fc13394', 'd432ratp3r3e5a4koomfimdrh8', '2025-09-13 16:57:45.443589', '2025-09-13 19:00:36.420004', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', 'synced', NULL, '2025-09-13 16:57:45.871051-05', '2025-09-13 19:30:00', '2025-09-13 19:45:00');
INSERT INTO clinical.calendario_citas VALUES ('eeba7fe2-49c1-400a-8907-a13f0cc888c7', 'CIT-00560006', 'fdab6850-337a-4b01-910c-1424e4bd9e0c', 'fc6a9e30-0796-47d8-904d-ef2f1eaa0b20', 'consulta_general', 'cancelada', NULL, 'Cliente canceló desde Google Calendar', false, NULL, 'b7vtnq6cs2lb09lsunl00goj3k', '2025-09-13 16:56:00.010801', '2025-09-13 16:57:09.852732', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', 'synced', NULL, '2025-09-13 16:56:00.501334-05', '2025-09-13 19:30:00', '2025-09-13 20:00:00');
INSERT INTO clinical.calendario_citas VALUES ('739d0798-df60-492c-b99e-4e4a0942a1bf', 'CIT-85265429', 'fdab6850-337a-4b01-910c-1424e4bd9e0c', 'fc6a9e30-0796-47d8-904d-ef2f1eaa0b20', 'control', 'completada', 'sigue enferma', ' | Cliente canceló desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar  | Cliente confirmó asistencia desde Google Calendar', false, 'f718e110-3bd3-4490-9cde-c87e87babb7b', 'grjlblpbik17cpn18sa66hbk8s', '2025-09-13 12:41:05.432032', '2025-09-13 17:56:18.393944', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', 'synced', NULL, '2025-09-13 17:02:07.405219-05', '2025-09-13 17:00:00', '2025-09-13 17:20:00');


--
-- Data for Name: google_calendar_audit_log; Type: TABLE DATA; Schema: clinical; Owner: postgres
--

INSERT INTO clinical.google_calendar_audit_log VALUES (1, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 12:56:28.054001');
INSERT INTO clinical.google_calendar_audit_log VALUES (2, '7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 12:56:28.065992');
INSERT INTO clinical.google_calendar_audit_log VALUES (3, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 13:04:38.778625');
INSERT INTO clinical.google_calendar_audit_log VALUES (4, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 13:07:25.161108');
INSERT INTO clinical.google_calendar_audit_log VALUES (5, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 13:09:03.46836');
INSERT INTO clinical.google_calendar_audit_log VALUES (6, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 13:10:19.431991');
INSERT INTO clinical.google_calendar_audit_log VALUES (7, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:36:25.732882');
INSERT INTO clinical.google_calendar_audit_log VALUES (8, 'd06f3df6-ec60-4769-b54c-56cdf59bc805', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:36:25.739717');
INSERT INTO clinical.google_calendar_audit_log VALUES (9, '7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:36:25.741582');
INSERT INTO clinical.google_calendar_audit_log VALUES (10, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:38:47.734407');
INSERT INTO clinical.google_calendar_audit_log VALUES (11, 'd06f3df6-ec60-4769-b54c-56cdf59bc805', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:38:47.741571');
INSERT INTO clinical.google_calendar_audit_log VALUES (12, '7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:38:47.747612');
INSERT INTO clinical.google_calendar_audit_log VALUES (13, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:41:05.537603');
INSERT INTO clinical.google_calendar_audit_log VALUES (14, 'd06f3df6-ec60-4769-b54c-56cdf59bc805', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:41:05.544001');
INSERT INTO clinical.google_calendar_audit_log VALUES (15, '7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:41:05.546402');
INSERT INTO clinical.google_calendar_audit_log VALUES (16, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:41:31.71618');
INSERT INTO clinical.google_calendar_audit_log VALUES (17, 'd06f3df6-ec60-4769-b54c-56cdf59bc805', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:41:31.722995');
INSERT INTO clinical.google_calendar_audit_log VALUES (18, '7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:41:31.724917');
INSERT INTO clinical.google_calendar_audit_log VALUES (19, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:41:39.430855');
INSERT INTO clinical.google_calendar_audit_log VALUES (20, 'd06f3df6-ec60-4769-b54c-56cdf59bc805', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:41:39.438411');
INSERT INTO clinical.google_calendar_audit_log VALUES (21, '7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:41:39.439819');
INSERT INTO clinical.google_calendar_audit_log VALUES (22, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:41:46.02589');
INSERT INTO clinical.google_calendar_audit_log VALUES (23, 'd06f3df6-ec60-4769-b54c-56cdf59bc805', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:41:46.031726');
INSERT INTO clinical.google_calendar_audit_log VALUES (24, '7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:41:46.034471');
INSERT INTO clinical.google_calendar_audit_log VALUES (25, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:44:57.152219');
INSERT INTO clinical.google_calendar_audit_log VALUES (26, 'd06f3df6-ec60-4769-b54c-56cdf59bc805', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:44:57.161614');
INSERT INTO clinical.google_calendar_audit_log VALUES (27, '7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:44:57.164182');
INSERT INTO clinical.google_calendar_audit_log VALUES (28, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:51:45.945547');
INSERT INTO clinical.google_calendar_audit_log VALUES (29, 'd06f3df6-ec60-4769-b54c-56cdf59bc805', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:51:45.964708');
INSERT INTO clinical.google_calendar_audit_log VALUES (30, '7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 14:51:45.967765');
INSERT INTO clinical.google_calendar_audit_log VALUES (31, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:04:22.874011');
INSERT INTO clinical.google_calendar_audit_log VALUES (32, 'd06f3df6-ec60-4769-b54c-56cdf59bc805', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:04:23.011933');
INSERT INTO clinical.google_calendar_audit_log VALUES (33, '7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:04:23.019985');
INSERT INTO clinical.google_calendar_audit_log VALUES (34, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:04:37.943699');
INSERT INTO clinical.google_calendar_audit_log VALUES (35, 'd06f3df6-ec60-4769-b54c-56cdf59bc805', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:04:37.951995');
INSERT INTO clinical.google_calendar_audit_log VALUES (36, '7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:04:37.955072');
INSERT INTO clinical.google_calendar_audit_log VALUES (37, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:06:52.373762');
INSERT INTO clinical.google_calendar_audit_log VALUES (38, 'd06f3df6-ec60-4769-b54c-56cdf59bc805', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:06:52.379026');
INSERT INTO clinical.google_calendar_audit_log VALUES (39, '7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:06:52.391012');
INSERT INTO clinical.google_calendar_audit_log VALUES (40, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:07:36.015203');
INSERT INTO clinical.google_calendar_audit_log VALUES (41, '7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:07:36.021108');
INSERT INTO clinical.google_calendar_audit_log VALUES (42, 'd06f3df6-ec60-4769-b54c-56cdf59bc805', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:07:36.025671');
INSERT INTO clinical.google_calendar_audit_log VALUES (43, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:07:46.238216');
INSERT INTO clinical.google_calendar_audit_log VALUES (44, '7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:07:46.24338');
INSERT INTO clinical.google_calendar_audit_log VALUES (45, 'd06f3df6-ec60-4769-b54c-56cdf59bc805', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:07:46.249499');
INSERT INTO clinical.google_calendar_audit_log VALUES (46, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:13:24.904555');
INSERT INTO clinical.google_calendar_audit_log VALUES (47, '7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:13:24.91672');
INSERT INTO clinical.google_calendar_audit_log VALUES (48, 'd06f3df6-ec60-4769-b54c-56cdf59bc805', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:13:24.918364');
INSERT INTO clinical.google_calendar_audit_log VALUES (49, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:16:22.139242');
INSERT INTO clinical.google_calendar_audit_log VALUES (50, '7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:16:22.147264');
INSERT INTO clinical.google_calendar_audit_log VALUES (51, 'd06f3df6-ec60-4769-b54c-56cdf59bc805', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:16:22.149106');
INSERT INTO clinical.google_calendar_audit_log VALUES (52, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:21:24.184524');
INSERT INTO clinical.google_calendar_audit_log VALUES (53, '7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:21:24.190338');
INSERT INTO clinical.google_calendar_audit_log VALUES (54, 'd06f3df6-ec60-4769-b54c-56cdf59bc805', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 15:21:24.19541');
INSERT INTO clinical.google_calendar_audit_log VALUES (55, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:04:21.121427');
INSERT INTO clinical.google_calendar_audit_log VALUES (56, '7f9963e7-c5d5-4c52-ac7a-f66ce3e99db9', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:04:21.131819');
INSERT INTO clinical.google_calendar_audit_log VALUES (57, '6d3668a5-160a-464f-97ae-5e1bc225cdd8', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:05:39.347345');
INSERT INTO clinical.google_calendar_audit_log VALUES (58, '6d3668a5-160a-464f-97ae-5e1bc225cdd8', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:18:02.440159');
INSERT INTO clinical.google_calendar_audit_log VALUES (59, '6d3668a5-160a-464f-97ae-5e1bc225cdd8', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:24:08.56546');
INSERT INTO clinical.google_calendar_audit_log VALUES (60, '6d3668a5-160a-464f-97ae-5e1bc225cdd8', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:30:42.210386');
INSERT INTO clinical.google_calendar_audit_log VALUES (61, '6d3668a5-160a-464f-97ae-5e1bc225cdd8', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:37:31.747367');
INSERT INTO clinical.google_calendar_audit_log VALUES (62, '6d3668a5-160a-464f-97ae-5e1bc225cdd8', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:42:51.351295');
INSERT INTO clinical.google_calendar_audit_log VALUES (63, '6d3668a5-160a-464f-97ae-5e1bc225cdd8', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "tentative", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:43:38.554639');
INSERT INTO clinical.google_calendar_audit_log VALUES (64, '6d3668a5-160a-464f-97ae-5e1bc225cdd8', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "tentative", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:46:11.116208');
INSERT INTO clinical.google_calendar_audit_log VALUES (65, '6d3668a5-160a-464f-97ae-5e1bc225cdd8', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:50:01.635702');
INSERT INTO clinical.google_calendar_audit_log VALUES (66, '6d3668a5-160a-464f-97ae-5e1bc225cdd8', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "tentative", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:50:23.110082');
INSERT INTO clinical.google_calendar_audit_log VALUES (67, '6d3668a5-160a-464f-97ae-5e1bc225cdd8', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:51:49.079041');
INSERT INTO clinical.google_calendar_audit_log VALUES (68, '6d3668a5-160a-464f-97ae-5e1bc225cdd8', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "tentative", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:52:06.904686');
INSERT INTO clinical.google_calendar_audit_log VALUES (69, '6d3668a5-160a-464f-97ae-5e1bc225cdd8', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "tentative", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:52:43.828998');
INSERT INTO clinical.google_calendar_audit_log VALUES (70, '6d3668a5-160a-464f-97ae-5e1bc225cdd8', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "tentative", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:53:00.790335');
INSERT INTO clinical.google_calendar_audit_log VALUES (71, '6d3668a5-160a-464f-97ae-5e1bc225cdd8', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:53:16.612471');
INSERT INTO clinical.google_calendar_audit_log VALUES (72, '6d3668a5-160a-464f-97ae-5e1bc225cdd8', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:53:26.35226');
INSERT INTO clinical.google_calendar_audit_log VALUES (73, '6d3668a5-160a-464f-97ae-5e1bc225cdd8', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:53:35.080173');
INSERT INTO clinical.google_calendar_audit_log VALUES (74, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:54:52.661392');
INSERT INTO clinical.google_calendar_audit_log VALUES (75, 'b6849a37-61fd-495c-aded-20d036a264dd', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:54:52.675113');
INSERT INTO clinical.google_calendar_audit_log VALUES (76, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:55:15.325554');
INSERT INTO clinical.google_calendar_audit_log VALUES (77, 'b6849a37-61fd-495c-aded-20d036a264dd', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:55:15.333306');
INSERT INTO clinical.google_calendar_audit_log VALUES (78, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:55:19.319047');
INSERT INTO clinical.google_calendar_audit_log VALUES (79, 'b6849a37-61fd-495c-aded-20d036a264dd', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:55:19.332309');
INSERT INTO clinical.google_calendar_audit_log VALUES (80, '739d0798-df60-492c-b99e-4e4a0942a1bf', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:55:22.517235');
INSERT INTO clinical.google_calendar_audit_log VALUES (81, 'b6849a37-61fd-495c-aded-20d036a264dd', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:55:22.528134');
INSERT INTO clinical.google_calendar_audit_log VALUES (82, 'eeba7fe2-49c1-400a-8907-a13f0cc888c7', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:56:31.333506');
INSERT INTO clinical.google_calendar_audit_log VALUES (83, 'eeba7fe2-49c1-400a-8907-a13f0cc888c7', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:57:03.513375');
INSERT INTO clinical.google_calendar_audit_log VALUES (84, 'eeba7fe2-49c1-400a-8907-a13f0cc888c7', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "declined", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:57:09.854804');
INSERT INTO clinical.google_calendar_audit_log VALUES (85, '93748851-5028-4b86-9ac4-6ea615738bf6', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:58:41.126399');
INSERT INTO clinical.google_calendar_audit_log VALUES (86, '93748851-5028-4b86-9ac4-6ea615738bf6', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 16:59:52.824652');
INSERT INTO clinical.google_calendar_audit_log VALUES (87, '93748851-5028-4b86-9ac4-6ea615738bf6', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 17:00:22.194096');
INSERT INTO clinical.google_calendar_audit_log VALUES (88, '93748851-5028-4b86-9ac4-6ea615738bf6', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 17:00:33.1701');
INSERT INTO clinical.google_calendar_audit_log VALUES (89, '93748851-5028-4b86-9ac4-6ea615738bf6', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 17:00:58.555771');
INSERT INTO clinical.google_calendar_audit_log VALUES (90, '93748851-5028-4b86-9ac4-6ea615738bf6', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 17:01:15.882616');
INSERT INTO clinical.google_calendar_audit_log VALUES (91, '93748851-5028-4b86-9ac4-6ea615738bf6', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 17:01:29.722836');
INSERT INTO clinical.google_calendar_audit_log VALUES (92, '93748851-5028-4b86-9ac4-6ea615738bf6', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 17:01:44.80704');
INSERT INTO clinical.google_calendar_audit_log VALUES (93, '93748851-5028-4b86-9ac4-6ea615738bf6', 'attendee_response', '{"email": "rikyd2010@hotmail.com", "response": "accepted", "display_name": "rikyd2010@hotmail.com", "is_organizer": false}', '2025-09-13 17:01:50.48167');


--
-- Data for Name: vacunas_tratamientos; Type: TABLE DATA; Schema: clinical; Owner: postgres
--



--
-- Data for Name: cajas; Type: TABLE DATA; Schema: financial; Owner: postgres
--

INSERT INTO financial.cajas VALUES ('3b17041f-c58d-4a1a-b513-fd7d720cb668', 'Caja Principal', 'Caja Menor', 'Caja principal de la clínica', 0.00, 0.00, true, '2025-07-21 12:58:52.381881', '2025-07-21 12:58:52.381881', '18e50a42-4833-4603-8b1d-98ecbbf353cc');
INSERT INTO financial.cajas VALUES ('3b107bf2-0077-4bfb-bfa2-072500fb5247', 'Caja Menor', 'Caja Menor', 'Caja para gastos menores y efectivo', 0.00, 0.00, true, '2025-07-20 21:53:49.956621', '2025-09-13 20:54:23.544874', NULL);
INSERT INTO financial.cajas VALUES ('44060d7b-c025-40fa-937b-3176c767f814', 'Cuenta Bancaria Principal', 'Cuenta Bancaria', 'Cuenta bancaria principal de la clínica', 0.00, 35700.00, true, '2025-07-20 21:53:49.956621', '2025-09-14 16:17:22.133405', NULL);
INSERT INTO financial.cajas VALUES ('2c106173-1a9b-4b71-a87e-b930ac866116', 'Caja Fuerte', 'Caja Fuerte', 'Caja fuerte para valores importantes', 0.00, 6000.00, true, '2025-07-20 21:53:49.956621', '2025-09-14 16:32:16.233483', NULL);


--
-- Data for Name: categorias_egresos; Type: TABLE DATA; Schema: financial; Owner: postgres
--

INSERT INTO financial.categorias_egresos VALUES ('501a8250-bbd3-492d-8bd5-8bc11d9eb971', 'EGR01', 'Nómina y Personal', 'Gastos relacionados con el personal', true, '2025-07-23 13:07:41.072392');
INSERT INTO financial.categorias_egresos VALUES ('0fa7775c-8c4f-4f36-871a-9f89cce73291', 'EGR02', 'Compra de Inventario', 'Compras a proveedores de medicamentos y productos', true, '2025-07-23 13:07:41.072392');
INSERT INTO financial.categorias_egresos VALUES ('9eb50d01-1834-4483-81ba-9658a55903fb', 'EGR03', 'Gastos Operativos', 'Servicios públicos, mantenimiento, seguros', true, '2025-07-23 13:07:41.072392');
INSERT INTO financial.categorias_egresos VALUES ('3c10b444-3993-402e-bd4f-97a4ee305612', 'EGR04', 'Marketing y Publicidad', 'Gastos en promoción y publicidad', true, '2025-07-23 13:07:41.072392');
INSERT INTO financial.categorias_egresos VALUES ('052b5944-82f9-475e-9f80-0383c4dcd40b', 'EGR05', 'Gastos Administrativos', 'Papelería, software, licencias', true, '2025-07-23 13:07:41.072392');
INSERT INTO financial.categorias_egresos VALUES ('d35b404b-ff5b-44af-bebf-5bec46992568', 'EGR06', 'Otros Gastos', 'Gastos diversos no clasificados', true, '2025-07-23 13:07:41.072392');


--
-- Data for Name: categorias_ingresos; Type: TABLE DATA; Schema: financial; Owner: postgres
--

INSERT INTO financial.categorias_ingresos VALUES ('6d39fc1f-012e-456d-83a3-85961506324d', 'ING01', 'Servicios Veterinarios', 'Ingresos por consultas y servicios médicos', true, '2025-07-23 13:07:41.061467');
INSERT INTO financial.categorias_ingresos VALUES ('6e09410d-c124-4170-ac95-cfc60583d445', 'ING02', 'Venta de Productos', 'Ingresos por venta de medicamentos y productos', true, '2025-07-23 13:07:41.061467');
INSERT INTO financial.categorias_ingresos VALUES ('8395e2a0-bc2c-4349-b788-f03f1ee8c21f', 'ING03', 'Terapias y Tratamientos', 'Ingresos por sesiones de terapia y tratamientos especiales', true, '2025-07-23 13:07:41.061467');
INSERT INTO financial.categorias_ingresos VALUES ('2df06d9a-1be5-46bb-8180-21f5520c990f', 'ING04', 'Otros Ingresos', 'Ingresos diversos no clasificados en otras categorías', true, '2025-07-23 13:07:41.061467');


--
-- Data for Name: conceptos_egresos; Type: TABLE DATA; Schema: financial; Owner: postgres
--

INSERT INTO financial.conceptos_egresos VALUES ('120bd48c-95ef-428a-b0c9-7df31bb98cab', '501a8250-bbd3-492d-8bd5-8bc11d9eb971', 'EGR01-001', 'Salarios Base', 'Salarios base del personal', true, '2025-07-23 13:07:41.07295');
INSERT INTO financial.conceptos_egresos VALUES ('15cf8ee4-d8de-421a-ad66-9097f8d968c1', '501a8250-bbd3-492d-8bd5-8bc11d9eb971', 'EGR01-002', 'Bonificaciones', 'Bonificaciones y primas', true, '2025-07-23 13:07:41.07295');
INSERT INTO financial.conceptos_egresos VALUES ('c2467344-0e5d-4048-89fc-5a285427f20c', '501a8250-bbd3-492d-8bd5-8bc11d9eb971', 'EGR01-003', 'Seguridad Social', 'Aportes a seguridad social', true, '2025-07-23 13:07:41.07295');
INSERT INTO financial.conceptos_egresos VALUES ('05db49a2-af65-449f-af5e-33422dbd63b0', '501a8250-bbd3-492d-8bd5-8bc11d9eb971', 'EGR01-004', 'Cesantías', 'Aportes a cesantías', true, '2025-07-23 13:07:41.07295');
INSERT INTO financial.conceptos_egresos VALUES ('1eaffe4e-572b-4072-81bc-70c76e33252c', '501a8250-bbd3-492d-8bd5-8bc11d9eb971', 'EGR01-005', 'Horas Extra', 'Pago de horas extra', true, '2025-07-23 13:07:41.07295');
INSERT INTO financial.conceptos_egresos VALUES ('c406b2f0-ff51-4269-8f03-aa220c697114', '501a8250-bbd3-492d-8bd5-8bc11d9eb971', 'EGR01-006', 'Vacaciones', 'Pago de vacaciones', true, '2025-07-23 13:07:41.07295');
INSERT INTO financial.conceptos_egresos VALUES ('a6ac981d-49f3-4447-97e9-5bcb5e3268c5', '0fa7775c-8c4f-4f36-871a-9f89cce73291', 'EGR02-001', 'Medicamentos', 'Compra de medicamentos veterinarios', true, '2025-07-23 13:07:41.073893');
INSERT INTO financial.conceptos_egresos VALUES ('b6aa2a5d-2612-4072-b4de-081b9d0b8242', '0fa7775c-8c4f-4f36-871a-9f89cce73291', 'EGR02-002', 'Vacunas', 'Compra de vacunas', true, '2025-07-23 13:07:41.073893');
INSERT INTO financial.conceptos_egresos VALUES ('831832aa-176f-4c0c-95ae-fdfe5052396a', '0fa7775c-8c4f-4f36-871a-9f89cce73291', 'EGR02-003', 'Material Quirúrgico', 'Instrumental y material quirúrgico', true, '2025-07-23 13:07:41.073893');
INSERT INTO financial.conceptos_egresos VALUES ('c3b93269-f1ba-485b-87a5-deac43d06492', '0fa7775c-8c4f-4f36-871a-9f89cce73291', 'EGR02-004', 'Alimentos Medicados', 'Compra de alimentos terapéuticos', true, '2025-07-23 13:07:41.073893');
INSERT INTO financial.conceptos_egresos VALUES ('cffb2af1-d1d3-4ecf-8e97-33bdb52a6862', '0fa7775c-8c4f-4f36-871a-9f89cce73291', 'EGR02-005', 'Productos de Limpieza', 'Desinfectantes y productos de aseo', true, '2025-07-23 13:07:41.073893');
INSERT INTO financial.conceptos_egresos VALUES ('d6d14345-2407-4deb-b876-8f0bbd0fc217', '9eb50d01-1834-4483-81ba-9658a55903fb', 'EGR03-001', 'Servicios Públicos', 'Electricidad, agua, gas, internet', true, '2025-07-23 13:07:41.074252');
INSERT INTO financial.conceptos_egresos VALUES ('023acab9-3d18-49c0-9c81-a1a20881ea30', '9eb50d01-1834-4483-81ba-9658a55903fb', 'EGR03-002', 'Arriendo', 'Arriendo del local', true, '2025-07-23 13:07:41.074252');
INSERT INTO financial.conceptos_egresos VALUES ('f2d7af21-76cc-42f7-b7a8-bdfce11a6105', '9eb50d01-1834-4483-81ba-9658a55903fb', 'EGR03-003', 'Mantenimiento Equipos', 'Mantenimiento de equipos médicos', true, '2025-07-23 13:07:41.074252');
INSERT INTO financial.conceptos_egresos VALUES ('fc4926f4-4dfd-4f2d-a6da-cc38d0b4fbf2', '9eb50d01-1834-4483-81ba-9658a55903fb', 'EGR03-004', 'Seguros', 'Seguros del local y equipos', true, '2025-07-23 13:07:41.074252');
INSERT INTO financial.conceptos_egresos VALUES ('82c300de-9cb2-480c-bb3c-686665b833fd', '9eb50d01-1834-4483-81ba-9658a55903fb', 'EGR03-005', 'Combustible', 'Combustible para vehículos', true, '2025-07-23 13:07:41.074252');
INSERT INTO financial.conceptos_egresos VALUES ('8f84669a-0d5a-4bb9-b449-e505a69aaade', '9eb50d01-1834-4483-81ba-9658a55903fb', 'EGR03-006', 'Telecomunicaciones', 'Teléfono, internet, celulares', true, '2025-07-23 13:07:41.074252');


--
-- Data for Name: conceptos_ingresos; Type: TABLE DATA; Schema: financial; Owner: postgres
--

INSERT INTO financial.conceptos_ingresos VALUES ('5b43f7cb-37f0-44df-a229-62714449e85d', '6d39fc1f-012e-456d-83a3-85961506324d', 'ING01-001', 'Consulta General', 'Consulta veterinaria general', true, '2025-07-23 13:07:41.068239');
INSERT INTO financial.conceptos_ingresos VALUES ('03ed2b30-d412-4773-9084-3ec62ab60b8d', '6d39fc1f-012e-456d-83a3-85961506324d', 'ING01-002', 'Consulta Especializada', 'Consulta con veterinario especialista', true, '2025-07-23 13:07:41.068239');
INSERT INTO financial.conceptos_ingresos VALUES ('c7870ccd-9f0f-43d6-8468-e06a069ce782', '6d39fc1f-012e-456d-83a3-85961506324d', 'ING01-003', 'Cirugías', 'Procedimientos quirúrgicos', true, '2025-07-23 13:07:41.068239');
INSERT INTO financial.conceptos_ingresos VALUES ('2c468392-c06e-47d7-a62a-5ae6d21933c4', '6d39fc1f-012e-456d-83a3-85961506324d', 'ING01-004', 'Vacunación', 'Aplicación de vacunas', true, '2025-07-23 13:07:41.068239');
INSERT INTO financial.conceptos_ingresos VALUES ('199ece51-a4a7-4a59-8c6d-ed53d6690e92', '6d39fc1f-012e-456d-83a3-85961506324d', 'ING01-005', 'Desparasitación', 'Tratamientos antiparasitarios', true, '2025-07-23 13:07:41.068239');
INSERT INTO financial.conceptos_ingresos VALUES ('26b011dd-a7c6-45e4-991d-f278b0bcffdc', '6d39fc1f-012e-456d-83a3-85961506324d', 'ING01-006', 'Exámenes Diagnósticos', 'Rayos X, ecografías, análisis', true, '2025-07-23 13:07:41.068239');
INSERT INTO financial.conceptos_ingresos VALUES ('07bd1e43-4699-4a9c-a0eb-bfb37eda1335', '6e09410d-c124-4170-ac95-cfc60583d445', 'ING02-001', 'Medicamentos', 'Venta de medicamentos veterinarios', true, '2025-07-23 13:07:41.071727');
INSERT INTO financial.conceptos_ingresos VALUES ('960630ca-832e-4966-9907-80506835843a', '6e09410d-c124-4170-ac95-cfc60583d445', 'ING02-002', 'Alimentos Medicados', 'Venta de alimentos terapéuticos', true, '2025-07-23 13:07:41.071727');
INSERT INTO financial.conceptos_ingresos VALUES ('83d8c3ea-0916-4b20-9356-89c58fed4555', '6e09410d-c124-4170-ac95-cfc60583d445', 'ING02-003', 'Accesorios', 'Venta de collares, correas, juguetes', true, '2025-07-23 13:07:41.071727');
INSERT INTO financial.conceptos_ingresos VALUES ('b7de2b49-631f-4d92-887f-98d71edd02c1', '6e09410d-c124-4170-ac95-cfc60583d445', 'ING02-004', 'Productos de Higiene', 'Shampoos, cepillos, productos de limpieza', true, '2025-07-23 13:07:41.071727');
INSERT INTO financial.conceptos_ingresos VALUES ('f87fd381-1d21-476b-9883-ad2efc5b1415', '8395e2a0-bc2c-4349-b788-f03f1ee8c21f', 'ING03-001', 'Terapia Individual', 'Sesión individual de terapia', true, '2025-07-23 13:07:41.072097');
INSERT INTO financial.conceptos_ingresos VALUES ('872a7709-e4f7-4c37-9533-7aaf67e0edc4', '8395e2a0-bc2c-4349-b788-f03f1ee8c21f', 'ING03-002', 'Paquete 5 Sesiones', 'Paquete de 5 sesiones de terapia', true, '2025-07-23 13:07:41.072097');
INSERT INTO financial.conceptos_ingresos VALUES ('2ad90bc8-00e2-455e-a66b-11786079b46a', '8395e2a0-bc2c-4349-b788-f03f1ee8c21f', 'ING03-003', 'Paquete 10 Sesiones', 'Paquete de 10 sesiones de terapia', true, '2025-07-23 13:07:41.072097');
INSERT INTO financial.conceptos_ingresos VALUES ('4b982b1a-397d-40f5-a33d-0a574226bf15', '8395e2a0-bc2c-4349-b788-f03f1ee8c21f', 'ING03-004', 'Rehabilitación', 'Terapias de rehabilitación post-operatoria', true, '2025-07-23 13:07:41.072097');


--
-- Data for Name: facturas_venta; Type: TABLE DATA; Schema: financial; Owner: postgres
--

INSERT INTO financial.facturas_venta VALUES ('bf9fa7b0-021c-49b4-acc8-6758037cead3', 'FAC-17578855', '46b889c7-d434-4653-94aa-8afe597b2a9e', '2025-09-12 16:32:16.233483', 6000.00, 0.00, 0.00, 6000.00, 'Efectivo', 'Pagada', '2c106173-1a9b-4b71-a87e-b930ac866116', 'Factura de prueba automática', '2025-09-14 16:32:16.233483', NULL, false, NULL, NULL, '76c12acf-e5a2-45b6-b399-6a49dbfdcab8');
INSERT INTO financial.facturas_venta VALUES ('bd1009fa-f34d-4990-89c8-a6bbc24c090c', 'FAC-17578840', '21176cd5-7e32-4c15-815b-b8917617f778', '2025-09-14 05:00:00', 30000.00, 0.00, 0.00, 30000.00, 'Efectivo', 'Pagada', '44060d7b-c025-40fa-937b-3176c767f814', 'Factura para cita: 739d0798-df60-492c-b99e-4e4a0942a1bf - Paciente: bombom', '2025-09-14 16:07:58.431661', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', false, NULL, NULL, NULL);


--
-- Data for Name: productos; Type: TABLE DATA; Schema: financial; Owner: postgres
--

INSERT INTO financial.productos VALUES ('aecfd408-6599-46b2-b220-26dda29b0d2d', 'MED-001', 'Amoxicilina 500mg', 'Antibiótico para perros y gatos', 'Producto', 'Medicamentos', 'VetPharm', 2500.00, 3000.00, -1, 10, true, true, NULL, NULL, '2025-07-20 21:53:49.956621', '2025-09-14 19:06:46.518593', NULL, '7501234567891', '', 0, 'unidad', 'lot003', '2025-09-30', 'cajon Medicamentos', false, 0.00);
INSERT INTO financial.productos VALUES ('feda5e84-04c8-4010-a71b-bd0a4a992b31', 'THER-001', 'Sesión de Fisioterapia', 'Sesión individual de fisioterapia', 'Terapia Individual', 'Terapias', NULL, NULL, 50000.00, 0, 0, false, true, 1, 60, '2025-07-20 21:53:49.956621', '2025-09-13 18:41:47.864474', NULL, '7501234567894', NULL, NULL, 'unidad', NULL, NULL, NULL, false, 0.00);
INSERT INTO financial.productos VALUES ('22d121b3-af74-49b2-8a03-9511d106342b', 'CONS-002', 'Consulta de Control', 'Consulta de control post-tratamiento', 'Servicio', 'Consultas', NULL, NULL, 40000.00, 0, 0, false, true, NULL, 20, '2025-07-20 21:53:49.956621', '2025-09-13 18:41:47.864474', NULL, NULL, NULL, NULL, 'unidad', NULL, NULL, NULL, false, 0.00);
INSERT INTO financial.productos VALUES ('3ee6bf18-cde0-4f81-93ac-7e16fb4d4a5f', 'VAC-001', 'Vacuna Triple Felina', 'Vacuna contra rinotraqueitis, calicivirus y panleucopenia', 'Producto', 'Vacunas', NULL, NULL, 45000.00, 23, 0, true, true, NULL, NULL, '2025-07-20 22:41:37.644055', '2025-09-13 18:41:47.864474', '18e50a42-4833-4603-8b1d-98ecbbf353cc', '7501234567892', NULL, NULL, 'unidad', NULL, NULL, NULL, false, 0.00);
INSERT INTO financial.productos VALUES ('a113fced-b6ab-419c-974c-2ac625c29506', 'THER-PKG-001', 'Paquete 10 Fisioterapias', 'Paquete de 10 sesiones de fisioterapia con descuento', 'Terapia Paquete', 'Terapias', NULL, NULL, 450000.00, 0, 0, false, true, 10, 60, '2025-07-20 21:53:49.956621', '2025-09-13 18:41:47.864474', NULL, '7501234567895', NULL, NULL, 'unidad', NULL, NULL, NULL, false, 0.00);
INSERT INTO financial.productos VALUES ('a5352a43-085e-4ead-9753-e0b811a1afff', 'ACC-001', 'Collar Isabelino Mediano', 'Collar de recuperación', 'Producto', 'Accesorios', 'PetCare', 8000.00, 15000.00, 0, 3, true, false, NULL, NULL, '2025-07-20 21:53:49.956621', '2025-09-13 18:41:47.864474', NULL, NULL, NULL, NULL, 'unidad', NULL, NULL, NULL, false, 0.00);
INSERT INTO financial.productos VALUES ('b893941b-b603-4c64-989b-ca0085d75a08', 'MED-105', 'Ketamina 10 mg/ml', 'Anestésico inyectable', 'Producto', 'Medicamentos', 'Genérico', NULL, 25000.00, 10, 2, true, true, NULL, NULL, '2025-09-13 18:16:13.337197', '2025-09-13 18:41:47.864474', NULL, NULL, NULL, NULL, 'unidad', NULL, NULL, NULL, false, 0.00);
INSERT INTO financial.productos VALUES ('bfc97632-243c-430e-8e27-5dceb022d02d', 'ALI-001', 'Alimento Premium Perro Adulto', 'Alimento balanceado para perros adultos - 15kg', 'Producto', 'Alimentos', 'Gosby', 100000.00, 120000.00, 30, 10, true, true, NULL, NULL, '2025-07-20 22:41:37.649011', '2025-09-13 18:41:47.864474', '18e50a42-4833-4603-8b1d-98ecbbf353cc', '7501234567896', '', 0, 'kg', '', NULL, '', false, 0.00);
INSERT INTO financial.productos VALUES ('c6472a7c-d0d9-4abf-a9d3-e1d5e221fe5a', 'MED-103', 'Pirantel Pamoato 150 mg', 'Antiparasitario interno', 'Producto', 'Medicamentos', 'Genérico', NULL, 12500.00, 80, 10, true, true, NULL, NULL, '2025-09-13 18:16:13.337197', '2025-09-13 18:41:47.864474', NULL, NULL, NULL, NULL, 'unidad', NULL, NULL, NULL, false, 0.00);
INSERT INTO financial.productos VALUES ('c96764f5-1934-411c-bc1c-3587348e482d', 'MED-104', 'Fipronil 10% Spot-On', 'Antiparasitario externo tópico', 'Producto', 'Medicamentos', 'Genérico', NULL, 15000.00, 40, 5, true, true, NULL, NULL, '2025-09-13 18:16:13.337197', '2025-09-13 18:41:47.864474', NULL, NULL, NULL, NULL, 'unidad', NULL, NULL, NULL, false, 0.00);
INSERT INTO financial.productos VALUES ('cdd7c4e0-3a05-4f76-837a-c52cf67d012e', 'CONS-001', 'Consulta General', 'Consulta veterinaria general', 'Servicio', 'Consultas', NULL, NULL, 80000.00, 0, 0, false, true, NULL, 30, '2025-07-20 21:53:49.956621', '2025-09-13 18:41:47.864474', NULL, '7501234567893', NULL, NULL, 'unidad', NULL, NULL, NULL, false, 0.00);
INSERT INTO financial.productos VALUES ('d03ab85a-2d89-4558-9e95-0bca0bcbc8d2', 'MED-102', 'Carprofeno 50 mg', 'Analgésico y antiinflamatorio', 'Producto', 'Medicamentos', 'Genérico', NULL, 12000.00, 30, 5, true, true, NULL, NULL, '2025-09-13 18:16:13.337197', '2025-09-13 18:41:47.864474', NULL, NULL, NULL, NULL, 'unidad', NULL, NULL, NULL, false, 0.00);
INSERT INTO financial.productos VALUES ('f4a0a3a9-25e3-4064-8bf3-e95f8406db03', 'FOOD-001', 'Alimento Terapéutico Renal', 'Alimento especializado para problemas renales', 'Producto', 'Alimentos', 'VetDiet', 45000.00, 75000.00, 0, 2, true, true, NULL, NULL, '2025-07-20 21:53:49.956621', '2025-09-13 18:41:47.864474', NULL, NULL, NULL, NULL, 'unidad', NULL, NULL, NULL, false, 0.00);
INSERT INTO financial.productos VALUES ('79002bec-0170-4576-9333-9b0727015203', 'MED-002', 'Vitaminas B-Complex', 'Complejo vitamínico para mascotas', 'Producto', 'Vitaminas', 'NutriPet', 15000.00, 25000.00, 3, 5, true, true, NULL, NULL, '2025-07-20 21:53:49.956621', '2025-09-13 21:34:31.221678', NULL, NULL, NULL, NULL, 'unidad', NULL, NULL, NULL, false, 0.00);
INSERT INTO financial.productos VALUES ('df1796f6-5219-4e64-8fe2-112124ce6adb', 'MED-101', 'Amoxicilina 250 mg', 'Antibiótico oral en cápsulas', 'Producto', 'Medicamentos', 'Genérico', 5000.00, 8500.00, 20, 5, true, true, NULL, NULL, '2025-09-13 18:16:13.337197', '2025-09-13 21:52:35.40428', NULL, NULL, '', 0, 'unidad', 'lot-003', '2025-10-30', 'bodega', true, 0.00);


--
-- Data for Name: control_terapias; Type: TABLE DATA; Schema: financial; Owner: postgres
--



--
-- Data for Name: proveedores; Type: TABLE DATA; Schema: financial; Owner: postgres
--

INSERT INTO financial.proveedores VALUES ('96d2523c-f35a-43a8-bc99-b88f1b3c9e19', 'Distribuidora Veterinaria Global', '900123456-1', '+57 301 234 5678', 'ventas@vetglobal.com', 'Calle 123 #45-67, Bogotá', 'Juan Pérez', 30, true, '2025-07-20 21:53:49.956621', '2025-07-20 21:53:49.956621', NULL);
INSERT INTO financial.proveedores VALUES ('8503ed21-ef0e-4552-aa02-9cd8e622a773', 'Laboratorios VetMed', '800987654-2', '301-555-9876', 'contacto@vetmed.com', 'Carrera 15 #30-50, Medellín', 'Ana García', 45, true, '2025-07-23 21:35:31.58586', '2025-07-23 21:35:31.58586', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c');
INSERT INTO financial.proveedores VALUES ('967a0d9d-421c-42ba-ba22-1d0fcc57d5a0', 'Proveedor Audit Test', '12345678-9', '555-0000', 'audit@proveedor.com', 'Direccion Test', 'Contacto Test', 30, true, '2025-07-23 22:10:21.071201', '2025-07-23 22:10:21.071201', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c');


--
-- Data for Name: ordenes_compra; Type: TABLE DATA; Schema: financial; Owner: postgres
--

INSERT INTO financial.ordenes_compra VALUES ('a2dedb42-109f-4e2d-a232-f100bad91a8f', 'OC-20250724-904571', '96d2523c-f35a-43a8-bc99-b88f1b3c9e19', '2025-07-23 21:41:44.571574', 325000.00, 'Crédito', '2025-08-23', 'Pendiente', 'Test purchase order created by automated test', '2025-07-23 21:41:44.571574', '2025-07-23 21:41:44.571574', '612b7d82-bf59-489a-8e1b-97c7dad91717');


--
-- Data for Name: egresos; Type: TABLE DATA; Schema: financial; Owner: postgres
--



--
-- Data for Name: ingresos; Type: TABLE DATA; Schema: financial; Owner: postgres
--

INSERT INTO financial.ingresos VALUES ('98ce798c-4820-4573-80f5-46e65974e146', 'ING-1757884078736', '44060d7b-c025-40fa-937b-3176c767f814', 'Pago de factura FAC-17578840', 35700.00, 'venta', '2025-09-14 00:00:00', 'FAC-17578840', 'Efectivo', NULL, '2025-09-14 16:07:58.431661', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL);
INSERT INTO financial.ingresos VALUES ('a89cd606-1660-4022-a4f7-0e6aca20dbe5', 'ING-1757885536264', '2c106173-1a9b-4b71-a87e-b930ac866116', 'Pago de factura FAC-17578855', 6000.00, 'venta', '2025-09-14 00:00:00', 'FAC-17578855', 'Efectivo', NULL, '2025-09-14 16:32:16.233483', NULL, NULL, NULL, NULL);


--
-- Data for Name: lineas_factura; Type: TABLE DATA; Schema: financial; Owner: postgres
--

INSERT INTO financial.lineas_factura VALUES ('3729ca75-1f1d-47c9-b0f8-3434618718f2', 'bf9fa7b0-021c-49b4-acc8-6758037cead3', 'aecfd408-6599-46b2-b220-26dda29b0d2d', 2, 3000.00, 0.00, DEFAULT);
INSERT INTO financial.lineas_factura VALUES ('5f6be2f8-2487-4278-94b7-06eea5f30e4f', 'bd1009fa-f34d-4990-89c8-a6bbc24c090c', 'aecfd408-6599-46b2-b220-26dda29b0d2d', 10, 3000.00, 0.00, DEFAULT);


--
-- Data for Name: lineas_orden_compra; Type: TABLE DATA; Schema: financial; Owner: postgres
--

INSERT INTO financial.lineas_orden_compra VALUES ('113abd63-6db4-4c93-83b9-275d9a067ceb', 'a2dedb42-109f-4e2d-a232-f100bad91a8f', '22d121b3-af74-49b2-8a03-9511d106342b', 5, 40000.00, DEFAULT);
INSERT INTO financial.lineas_orden_compra VALUES ('41fb9512-4383-4193-baa9-2d1e52fdbdd2', 'a2dedb42-109f-4e2d-a232-f100bad91a8f', '79002bec-0170-4576-9333-9b0727015203', 5, 25000.00, DEFAULT);


--
-- Data for Name: sesiones_terapia; Type: TABLE DATA; Schema: financial; Owner: dagonnet
--



--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: vetplus_auth; Owner: postgres
--

INSERT INTO vetplus_auth.usuarios VALUES ('d8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', 'Administrador', 'Administrador', 'admin@vetplus.com', '12345678', 'CC', NULL, NULL, '$2b$10$B7X7FlDADo3dasaTF3.6O.DB4Bl1H5mE3.I3RR.vRb8lSiO.gIvhi', 'admin', NULL, NULL, true, '2025-09-17 20:50:28.420533', 0, NULL, false, false, NULL, NULL, '2025-07-23 12:43:22.495009', '2025-09-17 20:50:28.420533');
INSERT INTO vetplus_auth.usuarios VALUES ('612b7d82-bf59-489a-8e1b-97c7dad91717', 'Juan Carlos', 'Perez', 'vet@vetplus.com', '87654321', 'CC', NULL, NULL, '$2b$12$fm8JRHtFFRglQVrYBebeN.4qlcyo5odPA2VkdUFd6MN6BFCi7eCRC', 'vet', 'Medicina Interna', 'VET-12345', true, '2025-08-20 21:23:53.631323', 0, NULL, false, false, NULL, NULL, '2025-07-23 12:44:56.843052', '2025-08-20 21:23:53.631323');
INSERT INTO vetplus_auth.usuarios VALUES ('31f56594-03da-4b11-ba03-0c0f6609e111', 'diego', 'sanchez', 'diego@correo.com', '1054988359', 'CC', '3052621653', 'Manizales', '$2b$12$/2JZ.XprRUxVUzucGuKqt.oD2zhRFgQ5qLUkIeSVFWoIMlPf2lrpa', 'aux_admin', '', '', true, '2025-09-13 11:27:47.320113', 0, NULL, false, false, NULL, NULL, '2025-08-01 22:13:31.954719', '2025-09-13 11:27:47.320113');
INSERT INTO vetplus_auth.usuarios VALUES ('fc6a9e30-0796-47d8-904d-ef2f1eaa0b20', 'maria fernanda', 'grisales', 'mariaf@correo.com', '10111213', 'CC', '3001234567', NULL, '$2b$12$t6xI6fmJEcZKVsROU7FgoOx7B2JvH6rXYRsMERRz7tKylu7SZZ/pG', 'vet', 'Medicina General', 'vet001', true, '2025-09-13 11:28:39.159603', 0, NULL, false, false, NULL, NULL, '2025-08-01 21:34:12.746994', '2025-09-13 11:28:39.159603');


--
-- Data for Name: transferencias_cajas; Type: TABLE DATA; Schema: financial; Owner: postgres
--



--
-- Data for Name: blacklisted_tokens; Type: TABLE DATA; Schema: vetplus_auth; Owner: postgres
--

INSERT INTO vetplus_auth.blacklisted_tokens VALUES ('0b88c53a-2064-4e0b-b52a-71dd15d43d4d', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTYyNTc5NzUsImV4cCI6MTc1NjM0NDM3NSwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.CJC_GxUTeUR-c_nOh7STuUznXqaiQenk_rTnTLkZXI8', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', 'logout', '2025-08-26 20:26:26.634506');
INSERT INTO vetplus_auth.blacklisted_tokens VALUES ('1039aaa2-7a19-4b91-bccc-ed183c62c21e', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTYyNTc5OTksImV4cCI6MTc1NjM0NDM5OSwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.geVXJ2L27Pt0rKj6LjlGyv5p-uNWI7LE2s2tc20ywws', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', 'logout', '2025-08-27 19:57:27.251831');
INSERT INTO vetplus_auth.blacklisted_tokens VALUES ('ac7a7629-3947-4ba0-95eb-7495286deb37', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjNmE5ZTMwLTA3OTYtNDdkOC05MDRkLWVmMmYxZWFhMGIyMCIsImVtYWlsIjoibWFyaWFmQGNvcnJlby5jb20iLCJyb2wiOiJ2ZXQiLCJub21icmUiOiJtYXJpYSBmZXJuYW5kYSIsImlhdCI6MTc1NjM0MjY1NywiZXhwIjoxNzU2NDI5MDU3LCJhdWQiOiJ2ZXRwbHVzLXVzZXJzIiwiaXNzIjoiVmV0UGx1cyJ9.1XBZU8iWEKWXxPxEB__RKz8ofm7Z4lQkJaxaDeFAN2U', 'fc6a9e30-0796-47d8-904d-ef2f1eaa0b20', 'logout', '2025-08-27 19:58:21.254885');
INSERT INTO vetplus_auth.blacklisted_tokens VALUES ('d4ba5283-b608-4f17-bcb4-2254d95201dd', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTY3NzA2NDAsImV4cCI6MTc1Njg1NzA0MCwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.oIzhKPr3EzKovbUpCbjhcmpqiwhw6Q0Oa2z91L3wuDQ', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', 'logout', '2025-09-01 19:58:36.691914');
INSERT INTO vetplus_auth.blacklisted_tokens VALUES ('b897d911-1352-4e45-95cb-0f999fbfd0d9', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTY3NzY2MTYsImV4cCI6MTc1Njg2MzAxNiwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.Fi9iR1RBTVRdcOmkJ_fJ_2FvVVdoPYV5eHd3LIEqYxo', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', 'logout', '2025-09-01 20:31:29.276494');
INSERT INTO vetplus_auth.blacklisted_tokens VALUES ('97a3b376-2821-4af7-9334-c3a71b48b191', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTY3NzY3MjcsImV4cCI6MTc1Njg2MzEyNywiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.2PuY2gmdZRQxG4Sxcn508oCwDuFccwpww1gKhujm78A', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', 'logout', '2025-09-01 20:49:31.951598');
INSERT INTO vetplus_auth.blacklisted_tokens VALUES ('20f99ce9-8454-4ffb-b7ad-c23be361606e', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjNmE5ZTMwLTA3OTYtNDdkOC05MDRkLWVmMmYxZWFhMGIyMCIsImVtYWlsIjoibWFyaWFmQGNvcnJlby5jb20iLCJyb2wiOiJ2ZXQiLCJub21icmUiOiJtYXJpYSBmZXJuYW5kYSIsImlhdCI6MTc1Njc3Nzc3NywiZXhwIjoxNzU2ODY0MTc3LCJhdWQiOiJ2ZXRwbHVzLXVzZXJzIiwiaXNzIjoiVmV0UGx1cyJ9.mNxmRF4k66MKR-sZ39VBNOuPvpxL_9Vycz-_QvUp6fs', 'fc6a9e30-0796-47d8-904d-ef2f1eaa0b20', 'logout', '2025-09-01 20:50:10.07747');
INSERT INTO vetplus_auth.blacklisted_tokens VALUES ('30ec7314-eac5-4688-9846-9946b3683617', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTc3NzAxODksImV4cCI6MTc1Nzg1NjU4OSwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.cx3MsRyYY43aBr6USBF2-8VZoZhrLYAN02lOhHnrPU4', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', 'logout', '2025-09-13 11:27:41.307519');
INSERT INTO vetplus_auth.blacklisted_tokens VALUES ('17fbe3f1-8d77-4415-92cf-aa9d5956d721', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjMxZjU2NTk0LTAzZGEtNGIxMS1iYTAzLTBjMGY2NjA5ZTExMSIsImVtYWlsIjoiZGllZ29AY29ycmVvLmNvbSIsInJvbCI6ImF1eF9hZG1pbiIsIm5vbWJyZSI6ImRpZWdvIiwiaWF0IjoxNzU3NzgwODY3LCJleHAiOjE3NTc4NjcyNjcsImF1ZCI6InZldHBsdXMtdXNlcnMiLCJpc3MiOiJWZXRQbHVzIn0.XoJREBDmrea7wAys3Rfr05Svnk-jaanbj286vVvNs1o', '31f56594-03da-4b11-ba03-0c0f6609e111', 'logout', '2025-09-13 11:28:31.72244');
INSERT INTO vetplus_auth.blacklisted_tokens VALUES ('fe69aaf7-fb18-4af7-b451-5a462931e0be', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjNmE5ZTMwLTA3OTYtNDdkOC05MDRkLWVmMmYxZWFhMGIyMCIsImVtYWlsIjoibWFyaWFmQGNvcnJlby5jb20iLCJyb2wiOiJ2ZXQiLCJub21icmUiOiJtYXJpYSBmZXJuYW5kYSIsImlhdCI6MTc1Nzc4MDkxOSwiZXhwIjoxNzU3ODY3MzE5LCJhdWQiOiJ2ZXRwbHVzLXVzZXJzIiwiaXNzIjoiVmV0UGx1cyJ9.4MS9SD-lAKh8MKzhAN5bgyjA7qR30Sv0fj6Xrc7SuZ4', 'fc6a9e30-0796-47d8-904d-ef2f1eaa0b20', 'logout', '2025-09-13 11:29:13.209992');
INSERT INTO vetplus_auth.blacklisted_tokens VALUES ('69628fc3-af63-4778-919f-ddf00752612c', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTc3ODA5NTgsImV4cCI6MTc1Nzg2NzM1OCwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ._D2AUjE8FgJe5zzFT15t0A_VjAbi1veXzGaHDaFkcmE', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', 'logout', '2025-09-13 11:45:57.178404');
INSERT INTO vetplus_auth.blacklisted_tokens VALUES ('c80c4d3e-f41a-4fdd-995e-5859ce710540', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTc3OTg5MTQsImV4cCI6MTc1Nzg4NTMxNCwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.AJVGI8wUvNZomwYG_Ic17htiWSpF2VU0nqcrrGfq8xk', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', 'logout', '2025-09-13 16:35:07.927065');
INSERT INTO vetplus_auth.blacklisted_tokens VALUES ('29528a25-7a9e-4160-b76d-a5d001078524', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTc3OTk0NDUsImV4cCI6MTc1Nzg4NTg0NSwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.9KT2q04kH2ZOtfU2ToG3NOeJFQyHiY-2GL9QJmKiTxo', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', 'logout', '2025-09-13 16:40:57.91513');
INSERT INTO vetplus_auth.blacklisted_tokens VALUES ('ef66bd45-a3c1-49b9-96ac-44bb280e7544', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTc3OTk2OTQsImV4cCI6MTc1Nzg4NjA5NCwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.glqLwOBIN-IS1BoYF9eWg8e3WWqElx2VaVBDmP_hbFQ', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', 'logout', '2025-09-13 17:24:53.532597');
INSERT INTO vetplus_auth.blacklisted_tokens VALUES ('06e36b87-4199-4de7-aa7a-df6fd12b081b', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTc4MDIzMDEsImV4cCI6MTc1Nzg4ODcwMSwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.Dr05hkIPRCLAw8R8ORGPVbksJFu2JqvCzkKr_qKxWOY', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', 'logout', '2025-09-13 20:31:05.111912');
INSERT INTO vetplus_auth.blacklisted_tokens VALUES ('0a1dd5ce-1020-4b2c-9992-09e21ed9c024', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTc4MTM0NjksImV4cCI6MTc1Nzg5OTg2OSwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.uaqmzQfA1_wk4G-QtStdoUFUaxnQinaMBfTlajbylTQ', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', 'logout', '2025-09-14 09:10:41.096606');
INSERT INTO vetplus_auth.blacklisted_tokens VALUES ('d0084451-781a-48dd-a8de-bf76459f7936', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTc4NTkwNTEsImV4cCI6MTc1Nzk0NTQ1MSwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.lLccYiTIgaeR39ApkYuGG7OkiuCewQa6EpSofVLOmAM', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', 'logout', '2025-09-14 10:19:06.209367');
INSERT INTO vetplus_auth.blacklisted_tokens VALUES ('22090c38-5b4c-41d3-9c92-d0c8b9c2287b', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTc4NjMxNzksImV4cCI6MTc1Nzk0OTU3OSwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.Z9a3ZWsqsQx8_9n-YGVHhS5CTQOXu7EaMEPtPGrqve8', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', 'logout', '2025-09-14 18:09:12.003586');
INSERT INTO vetplus_auth.blacklisted_tokens VALUES ('20704842-bd9e-42fc-a0f3-055752b26a7d', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ4ZDQ4ZjhmLWNmYjEtNGYzYS1iMmQ4LTJkNTE5NWEzODYxYyIsImVtYWlsIjoiYWRtaW5AdmV0cGx1cy5jb20iLCJyb2wiOiJhZG1pbiIsIm5vbWJyZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NTc4OTEzNTYsImV4cCI6MTc1Nzk3Nzc1NiwiYXVkIjoidmV0cGx1cy11c2VycyIsImlzcyI6IlZldFBsdXMifQ.6QU13493w8d8E170yj1Q9MEuFlg5Xux3tHZDuM1t-6k', 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', 'logout', '2025-09-14 18:51:59.738565');


--
-- Data for Name: google_calendar_config; Type: TABLE DATA; Schema: vetplus_auth; Owner: postgres
--

INSERT INTO vetplus_auth.google_calendar_config VALUES ('c294327d-912d-4c21-bb7a-7e862e71b326', '54253011928-2lqgnjv6c3u66vrmaquj0ng6g28uhrne.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', NULL, NULL, NULL, 'primary', 'America/Bogota', true, true, 30, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-07-27 20:35:42.973021-05', '2025-08-01 08:14:28.043122-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('95a94a46-3bca-45db-8ade-a3ec858eb192', '54253011928-2lqgnjv6c3u66vrmaquj0ng6g28uhrne.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', NULL, NULL, NULL, 'primary', 'America/Bogota', true, true, 30, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-07-31 18:57:05.157324-05', '2025-08-01 08:14:28.043122-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('c63ecaf5-8ba8-4e68-bdbd-2b1f7dab1172', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//01227xPyK1scJCgYIARAAGAESNwF-L9Ir-cV-YSe3vPMx8Tis3iNvrX7mtszTEYnjNll8VYili624mJoKiamZeZDgDPKdrwT6GxI', 'ya29.a0AS3H6NyVHVYrG2Ka-LwNVPL6KhF1jolzMaO4fnhjohsT9sEZVvN3QhBQXWxQF3XNba0Wez0_jfibcmwJQMi_E1xCZ85oAnrhNZw67xTMu6J80VgNeDqry6IlQEAT0WOL396WexJBVsr9lt7kK7SbfpVXRNCYh_4c1c00diIPaCgYKAVsSARQSFQHGX2Mivs5r8XhwRrnJ4opYcwVkuw0175', '2025-08-01 08:20:46.08-05', 'primary', 'America/Bogota', true, true, 30, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-07-31 21:04:31.129965-05', '2025-08-01 08:14:28.043122-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('ab6e0433-1462-45e2-8c7f-7bb6ef383b67', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', NULL, NULL, NULL, 'primary', 'America/Bogota', true, true, 15, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 07:26:41.823896-05', '2025-08-01 08:14:28.043122-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('fd2fbd8e-a2ee-4bbb-abcb-02b2ce6b4975', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//01HxX-U8O3kOTCgYIARAAGAESNwF-L9IraqHo4J47oaUHT6exFwKkfXCWtOeZW7V7siHFlcfWnuTd1p7y3xF8l7En4BzsZvYu6bc', 'ya29.a0AS3H6Nz5KfqqSLmaI6tAgMITtd8BEnrrY81COYM7CsDN31SlPzvNbPcRDeX12nsUHoeKZ1b49IaJtQU_j_4GwVuZoc2uAHeZkw3a1a_wqLIFoBvHoX2VXY4nxiH8sd9_QDxJcCOU6u8bjCws_25f6pZxRkkkMqeUViT9JsCOaCgYKAUESARQSFQHGX2Mig-86OeGK0b1Hmc2Ivxb8_A0175', '2025-08-01 09:01:27.963-05', 'primary', 'America/Bogota', true, true, 15, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 08:01:21.597679-05', '2025-08-01 08:14:28.043122-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('a5689a1a-60c8-4de8-a228-2b11c970baab', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', NULL, NULL, NULL, 'primary', 'America/Bogota', true, true, 15, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 08:01:11.099208-05', '2025-08-01 08:14:28.043122-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('c17b5718-7007-4a93-8769-4253114d2a46', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//01fqUwuYnroA0CgYIARAAGAESNwF-L9IrxdrLswnkYgkmav-2SFk4waAQshD7uzYMmM0CwpxKJhs69dAPjwZ0uVPiFQBPVlloz-I', 'ya29.a0AS3H6NxhCvaBzZdcAMxQFtFqCju6IHjAdM_CyJo_smFrU8Y6ITxdkFjWMNUGqgxjYPY0oQ8GOluSJl4VOtXykbogmzGv3p7Csa7bc_DRErBwzELoR5ARfEWw9r7rH817W7WMhghYXG51e0At8c1S_H7iVHmkR2Uhu60JM-YkaCgYKAYISARQSFQHGX2MiRBf0p4mCtnUj2bYgV0TeQw0175', '2025-08-01 08:50:13.771-05', 'primary', 'America/Bogota', true, true, 15, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 07:50:07.628864-05', '2025-08-01 08:14:28.043122-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('55c023d1-21df-42f6-94dd-db3b0847fb72', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//01gknw9CC41ziCgYIARAAGAESNwF-L9IrJheEj6SmlgjT1fAR22mQ5quyOYS8l38gyz1Hh8LZPOsAzB1mtKb2F4wPuUIbOuUJr5c', 'ya29.a0AS3H6Nxp3aqnfgMLLRIibvSy-HM2qv-WoCMOthEVbAxN4z4O8pLImPszcSS8RZb8VYsam_1aXnYA7SeFtcn3BSj1VmZn-uywXx0EaFxr-z7roaLzU41fnfGwWPvK_Mw4B_fIF5o3_b6KhnQNnyU2pi0KOId8RiuBCBBOtDktaCgYKAfISARQSFQHGX2MiR-3RIvcQXggE6TtssIIaeg0175', '2025-08-01 09:00:39.945-05', 'primary', 'America/Bogota', true, true, 15, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 08:00:32.199615-05', '2025-08-01 08:14:28.043122-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('a7ca300a-1281-4490-b9ed-8f4802f72153', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', NULL, NULL, NULL, 'primary', 'America/Bogota', true, true, 15, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 08:01:17.660647-05', '2025-08-01 08:14:28.043122-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('92595f3c-e1b4-494a-bb5f-0eee1602c15e', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', NULL, NULL, NULL, 'primary', 'America/Bogota', true, true, 15, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 08:14:23.175522-05', '2025-08-01 08:14:28.043122-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('8b29a02a-77e5-4242-8d2c-bcb5c3a50da2', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//01vsvX9t41cBZCgYIARAAGAESNwF-L9IrafQQLcnzKyiq6NETUYoZski4YBmAu9RHtf4wyu5wVhYNgS5ZgJewPk_vi4mLfamj9D4', 'ya29.a0AS3H6NwCuawQH_0tobR0NvRLlnY_5sGVksg6CRDWMVTQa0v9F2NBE5FwgCr-QNEj9-A71dAzIzGbEyA7_WI50ZJ1stZIVajNqDfrFmYxzfi_1sMVbxyLlqUvgCrO6zSigJwVR8ljEKEfcVJq3YuTX0JTCH5JnAdi5tb5l99DaCgYKAQMSARQSFQHGX2Mi8odp0652wGAG0ogxOZDaPA0175', '2025-08-01 08:26:58.529-05', 'primary', 'America/Bogota', true, true, 15, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 07:26:45.841298-05', '2025-08-01 08:14:28.043122-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('e39f9011-a33e-4c4d-9998-c80b157c6a64', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//01cp-4kVYkddWCgYIARAAGAESNwF-L9IrYnyo_05zVarL_wnV3JcRYyRJky3YXgl202YbH5aw-b2ChXIGr-p3jAqT0cAI0bcnScs', 'ya29.a0AS3H6NwtvjFWu9ea3_F9804AlKrwbDd8PqacMkP6zn3BA9C1xAkm0-eSPJtHRfnqTi7Zgzvp-kN1ZgGlv6rfNaYnhafvczZp0J_6KYrXZwl4poGbH8H4FhJKpzevtN17bjUUg8-jDPHe4JemH4-zzBoGQ362Qn2NEjXB7TCkaCgYKAW0SARQSFQHGX2MitJnvnrN5gzmqN_yNuuKVCg0175', '2025-08-01 08:27:14.792-05', 'primary', 'America/Bogota', true, true, 15, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 07:27:09.463812-05', '2025-08-01 08:14:28.043122-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('70b901ed-4a24-4b9e-8982-1d26b7672892', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//01cDZah9-egsfCgYIARAAGAESNwF-L9Ir91LvWpOf4I4_g5F9caga8zX9COA59WH_UrJV2OY9NpbVFqB4EMfJwj4LxTSx8IS7Coc', 'ya29.a0AS3H6NwZtkRwgrKav_NsgR4dVodVvKFt0IveKEp8-PlN0y9rZmXr7XFrLuZcUgOG-F8YSaPglgB6cUMeha8rZkISPZ49RwOC7Ngzzc9mBIvUYBhJSs7f7KvXP10rFD5dfPsKtZMC_Ic7muUKMpO3qubK8yjYirgKhzwwRWmTaCgYKAXISARQSFQHGX2MiCz7cQzYIHLm1tpivtJpUkw0175', '2025-08-01 09:29:25.323-05', 'primary', 'America/Bogota', true, true, 15, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 08:14:28.04478-05', '2025-08-01 08:30:44.636296-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('7642357a-0cec-47df-8f71-e4db472b9fd5', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//01DtPW5zrG28QCgYIARAAGAESNwF-L9IrGD3dP1dzTDUK4tcuYFbWX8EGncpl_CxaUCCFAUokmOn8QDg2Ls2we-oQN5ZoBUWHQJk', 'ya29.a0AS3H6NxSridd3JekikXsrvV1Gscuh_4z2OdPJtabMpL8er12WAr0EsWU8BbSt59Dw0hTvGG-wanrpQUS8UcZsnA0KVaaG88Cd2NkNVgY7NHBpD8VRzzKlLwrJMKBCDQ6Ma2J9H8WwFnliLr4ULqn4NPQTl5RRZY1dFJAZcluaCgYKAeoSARQSFQHGX2MisofYEewp28hbYwMn503mlQ0175', '2025-08-01 08:28:52.645-05', 'primary', 'America/Bogota', true, true, 15, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 07:28:36.977452-05', '2025-08-01 08:14:28.043122-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('526730c9-71ce-4ed6-9b44-2a2661ebcc1e', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', NULL, NULL, NULL, 'primary', 'America/Bogota', true, true, 15, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 07:42:01.491606-05', '2025-08-01 08:14:28.043122-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('051cb016-fdb6-47e4-9150-427786e4f9a9', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', NULL, NULL, NULL, 'primary', 'America/Bogota', true, true, 15, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 07:50:03.919083-05', '2025-08-01 08:14:28.043122-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('8252313e-8088-4528-87f1-cc5145823952', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', NULL, NULL, NULL, 'Primary', 'UTC', true, true, 30, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 08:34:42.112387-05', '2025-08-01 08:34:48.643832-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('be31be22-a677-446b-be56-a16e5f2f6dd6', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//01hTXqI2uvfQhCgYIARAAGAESNwF-L9Irq4pMn01c6A03JbFRZ-1BP6D_ZFx_e5JHxznVDCiARushMJzQc5eFAdvGqs6RE_nTrbE', 'ya29.a0AS3H6NwAEI7UHs_d4MI92fnPb29CTH6DoHg1cQmsQdTbqowYdOx1XYuVKDmb6NtsanQrBqozDf0OfKo5N7faUgb3N0sqYiGcmuYxlWcd6_2ZsmjE9ZlZDF1frd7hdShI5urC6H4P6omtQK2oNbWUs8N7dS5ESw92sj3pDoNLaCgYKAbUSARQSFQHGX2MiQczucnmNAo_mXXmqU3ptXw0175', '2025-08-01 09:34:58.56-05', 'Primary', 'UTC', true, true, 30, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 08:34:48.651497-05', '2025-08-01 08:38:47.380138-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('49ed4c6a-376e-42f5-b621-7322da319adf', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//015_9d0WhnGsECgYIARAAGAESNwF-L9IrRV3sX9KvBvHjlhi_7lNd91DSS8S8wfP824lVpGiKRHkO8CjgpHw5FjkFMBiEuKRfHkw', 'ya29.a0AS3H6NyYwGffHsL9_rTDvqMH9v84UhgtJk7FWGcFSwpzd0DVgcPBGocrdBZ0xCsol11CdCSGyf_JfCqtaXUaJbhFYvPkFx4rfbzlkKhMHt6cHX0EwI9ZCse19b0XNtvzd3dif53dKWG9sUp23VUJBNVrIke3CVpy30bU8iq8aCgYKAWsSARQSFQHGX2MiYmA8n0BBYnOH_9QPL3Vz5w0175', '2025-08-08 21:14:54.931-05', 'primary', 'UTC', true, true, 30, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-08 20:14:11.253769-05', '2025-08-17 11:01:12.506524-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('79359217-5902-4bf9-aef2-4d940496c557', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', NULL, NULL, NULL, 'primary', 'America/Bogota', true, true, 30, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 07:51:49.194456-05', '2025-08-01 08:14:28.043122-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('df4323a6-74e8-4b6c-98f8-7b0d535906cc', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', NULL, NULL, NULL, 'primary', 'America/Bogota', true, true, 15, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 07:28:26.014921-05', '2025-08-01 08:14:28.043122-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('c6d9fbc4-c4c7-4928-9446-0dd1e0456081', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//01x_i9WmO_4YVCgYIARAAGAESNwF-L9IrfpldZUjR9FeL7BKMx6EJGPVS13_Yu57mJ0BZWx3s3kx-n9oxQ0-C3CrZBCfzlac_vZw', 'ya29.a0AS3H6NxgOyW3tDfxXCjIyoIKbglAZ5OUsy8CBqVpbLo359Atn8n_yiDu02Lv6u9UYtLFW_XwMebT6w7HiLNEmo9uqvdIexeC38yTyv4omXz6OvtuTF36tXOjJAhsNvoks1z8ZgNLPnkTh93BBcHHOJf18lCjQKjaeJT_0e7waCgYKAb4SARQSFQHGX2Mi-XjdHFJL9SkSGkXcUDIbVw0175', '2025-08-01 09:38:59.753-05', 'primary', 'UTC', true, true, 30, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 08:38:47.385057-05', '2025-08-01 21:00:52.3997-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('19b64f92-b5cc-460b-965f-78ca44fee50d', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//01wrwN9CNo3ssCgYIARAAGAESNwF-L9IrSXc9MwDcrsk4LJzLizXrLYd442TKmFLy5Vtb-lrYKPMycaBRTmUeFy1HJJcUbvQ-0Mw', 'ya29.a0AS3H6NyCm8_d3A8Ee0YDQ87qSTUAFsNQb9WmOPETjmTS9AKQBa-LLyQhNPngW-KcoXeoJtBaz5mPAndo4fD3jpmjH1MOKEkHwVyNkssp7CGZFxIwYyUCIIOlOcg_sTvCri3UTF_VeiPUMrjyE8oxH-Pp9ewOz-k1qLGvW-L3aCgYKAacSARQSFQHGX2MifkGFm4QNO4JPhSDWVxyMhA0175', '2025-08-01 08:52:01.686-05', 'primary', 'America/Bogota', true, true, 30, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 07:51:55.754061-05', '2025-08-01 08:14:28.043122-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('e4b71b0a-1964-46e3-8833-feff780f4bef', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//01cELGbOIgpqXCgYIARAAGAESNwF-L9IrA1OwR8mkPkhaRAR16p5beBN5-tAjNuu6KybDm3vLZ9g060NPCBKzJSLfJ392xB5yuq8', 'ya29.a0AS3H6Nx-SLRIWo3oXkLYqp9v0EeR3Nifw4Lodd9YHBJk9ST6ld_Z6pnMkDk1TirJ8I9ew1N6OeWAqqDZy0kGuHEFwuhTmY-1Jb8_hukIZ5xKYOFx54I6Nrm0MFYGbyzXDmlsXltKq66nM_gfFuEe95H2jcs44xHg65QG4IJPaCgYKASoSARQSFQHGX2MiehMNxgHDfs0PbTgCmlPGWw0175', '2025-08-01 08:42:13.034-05', 'primary', 'America/Bogota', true, true, 15, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 07:42:06.61775-05', '2025-08-01 08:14:28.043122-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('9c99847e-050f-4c31-8356-1784cd689e03', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//010Ooni9vgjBpCgYIARAAGAESNwF-L9IrJNcv2iB7TediReUNhXrygV8b3H3E8f4OoZ6DrEQPUqTPb8MLaXDzjU6SyObpEKmh5_g', 'ya29.a0AS3H6NwOtOds0L2orgZZ_7QN2I4f0t_mBujQ1NKRY9JWiYKBDBeu9u6H5Oi-GBS6wqIjHkacVVmGXCLP_nUugeZ_raDcv_EAziQdwGzbqG57tSPliqkKQ9KHTEGWxXeRGtQcrh8M0dJsuou5eOg6QlpS8BBJBBrbNOAauP3xaCgYKAUESARQSFQHGX2MidU7MzjVbwdpr89WCvnLsmw0175', '2025-08-01 08:43:09.025-05', 'primary', 'America/Bogota', true, true, 15, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 07:43:02.57231-05', '2025-08-01 08:14:28.043122-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('6585046d-e54f-4829-a29d-151ee88092d9', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//01exMnYsiDpARCgYIARAAGAESNwF-L9IrBi0TXrnjVIwdbG5DFnKVNsDQtMdhwQGS9h49Ziub2dSM7KL2XT-CbUV4Z6GfyyBLOY0', 'ya29.a0AS3H6NxGqVlw-4oenXmKf5SUGeRGPspxlTXnVLVlBjCxex5DaUPvKu-8SCQkipvjjTWV3_HiWg4fv-TKDNfzM4zDGrdxgVSqUVusIDM1jxsFRnADnVQG60EG9FVkUNFb-H3eyiDgG9-VzYLI4PZbXkJmR1GL8FPc2pXCAapGaCgYKAYoSARQSFQHGX2MiPcywXlR2VBORDdC3_l6kuw0175', '2025-08-01 08:43:53.381-05', 'primary', 'America/Bogota', true, true, 15, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 07:43:47.304576-05', '2025-08-01 08:14:28.043122-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('f1523726-482e-45fb-91e4-6cd460bebfe0', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', NULL, NULL, NULL, 'primary', 'America/Bogota', true, true, 15, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 08:00:29.080503-05', '2025-08-01 08:14:28.043122-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('2d2eb8e7-dd91-48e4-93c0-36699c084588', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//01VW9kayJ4PnyCgYIARAAGAESNwF-L9IrkRdQEP7OzEQWh-f6wbfg7O1cuir7p7u12JA8VEfMoKQnWqMV-0zk87AMLZDvB9SEJAc', 'ya29.a0AS3H6Nyg6-Wib4yXCxKxsKeO35z1gBkS7htKiuYDu_AwTrl6g-64ZUeUcJ5VLl17GXHX5fTzzXpl4ny0wqEyOS1d-G3fR31gz_gZyEEL-GEs8EgM_JMzDPUpLQB8Nj2YhOJQ6VCQZIoEG-v2qD3GQ-tMy8fEUrcCAeICBK0TaCgYKAcYSARQSFQHGX2Mioa-bW6EcJy2w2AzWtMisng0175', '2025-08-01 22:01:07.583-05', 'primary', 'UTC', true, true, 30, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-01 21:00:52.406677-05', '2025-08-08 20:14:11.248692-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('66b879bb-4065-4387-bdab-c2370cb37f1c', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//01yV3CV2BEAZKCgYIARAAGAESNwF-L9IriDlAPM8eXCFjop9TVwe7ynQ7bKj98MGyM1kXqa6jPGdFfwT6EGzelTnhwr-q91w15cw', 'ya29.a0AS3H6Nz1ymtzLYIPNzkbh4v5CfBPatLIHPicA4IYh8CwLoFNn6xqrTDiVUzN4JmnXj5GPBN2Ki1AV_qmx1uyf8CZpwhuZ79ueMqKYaNfOmcAQsARnygyaUkHje0R4XsdNn_quGTpH-ICs93wXI79RQgnZ-rO2PFaBa09D-mfaCgYKAU8SARQSFQHGX2MiZNxgDfDW-8lpS-ldJNakKg0175', '2025-08-17 12:01:54.298-05', 'primary', 'UTC', true, true, 30, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-17 11:01:12.515695-05', '2025-08-22 12:59:10.78681-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('6e6d85dc-20d0-4be2-9135-51b67fb8d40b', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//01gWQ_dxTbYNNCgYIARAAGAESNwF-L9IrOfYFa8h4QbIsomcNvMiAkEDIKvDRfrYj9kQo9d5o7LVD040QJm-vpE91ICrwd2WzHMI', 'ya29.A0AS3H6Nw99J_8_cC67B0HqX-EgGDj1BzfXlgBA4Hj_Chs7IUJUBywWhF_9iOfkZ5oZllyE-uTOf6Mapx0nRbYSZGq_dOhEzPOjxwnc36iQXhpKnYbkkluZAhktuqnAPIL5yp526cRRtT11TowmcJcuikRBIoJ0wR6-_yvZwQo0zFylSAlWjPUTaWipJlIEfOaxy65VpAaCgYKAQYSARQSFQHGX2MiCj_ZkKfNGqtgZ4ZQncnBzw0206', '2025-08-22 13:59:52.293-05', 'primary', 'UTC', true, true, 30, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-08-22 12:59:10.795275-05', '2025-09-01 18:54:14.536079-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('589a6057-95cd-4333-9246-4675aaa7a692', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//01iu7vcgC4j-wCgYIARAAGAESNwF-L9Ir7Y20fnGvCnAYqax0TPeC39HCIYShJfw4GaTlXaxZ0_bbak_7x6h0XnyjNoWaX-FhB-g', 'ya29.A0AS3H6Nw_67kU8nm1XNmA0JmYdJ7V6bpXAv1MtQHBobJyKTM1FhsgrlJKbZ1BbaaXw55Yoppxk99wXK-b38bV4wve6idVsucCJsYWdAXcMBDlZc-Ke-yk1V3p1uG8AQ3ceqHwBGTQSrX9DyRonrMjfWXdyZ1OJwF_R1_GeOPhb-pi6fTq0o10FobKALkFexkpjqrafSwaCgYKAfUSARQSFQHGX2MiZFZZkPPILhwYMNJrDe6GBA0206', '2025-09-01 19:54:26.25-05', 'primary', 'UTC', true, true, 30, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-09-01 18:54:14.543944-05', '2025-09-01 20:38:02.491752-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('797ec04f-00a3-438e-9065-a01658676269', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//01vEhuqgyUKrOCgYIARAAGAESNwF-L9IrrdW61o8PY2w91t1WmZxEK0qHsgB_V41VeR1vVr56BsFvhkhG4vvmT90TP2GZGy4gYrM', 'ya29.a0AS3H6Nw3CF0iyRnBJJO3kgVCeyadfLrFfAV0PXsyjLgYZI8a8_mIN1rndlD0HdFkU8V-Uhf797NpGSOOFxXCQp_Mwnqf8U3SPtI4lb2XcqBSNo5tbJD2k7AZ7GPg6dJ4iJXjeFMAQaqNDh4E5o3rqQt44GADFJjlKiuVLOfGRG0YuRMVtbUC0eLCDFY2pfYsLFOJF0saCgYKAbcSARQSFQHGX2MiUpfAYscNGFZXKjC8oX-oRw0206', '2025-09-13 17:48:50.647-05', 'primary', 'UTC', true, true, 30, 24, true, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-09-13 16:48:42.754906-05', '2025-09-14 10:20:44.218392-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('f6c7f9a8-9800-4dd8-9084-99f17af579d1', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//01hrN6Av6ByBxCgYIARAAGAESNwF-L9IrbekfqJSG8QbYoCLDt8rohk1UmMS1JhB0tHkBSB9X_KX7dxOLFdGkVxL6ch71ldXm6BE', 'ya29.A0AS3H6NyCyi3_4_RyJwRtSE7YXfRMkNOtSOxzbKtQhS4pxqYyM2zSUEitO7kEduG26YhIFigOQ8lcVzjlQhdZWTlGZ2Tw1YJcI1U6BKq-NGXIRlz8CVpHkrQApib5-Q0y8aWaUNLWN_Mg21ymy-ugJ7mEgkbIVRMrqN7giUp9Xs90lMnI4hftAMe6gq3shAH6nQzW7RkaCgYKAZISARQSFQHGX2MiE-Ef7XF-2w7FmyK5_INOEQ0206', '2025-09-01 21:38:26.006-05', 'primary', 'UTC', true, true, 30, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-09-01 20:38:02.500515-05', '2025-09-13 08:31:06.796372-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('2201ce68-3273-4698-8eb6-87de61a0fcdd', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//01BDaSl8VIr-SCgYIARAAGAESNwF-L9Ir3YK00NbD9uk9NV4XGkwRmlV8IrZ2OKVZ1fabKCuMZRUrITNGYA78slQrOZzQSIDcdtA', 'ya29.a0AS3H6NxMsDW-4gSpdEaj0NXPIMpTmy_NIdiTTya-lLGh2pr7Tr5jRn6R1G7dc7zY65l31co9h8M4tdW1M058QIphSfvPGuHSuTG3--cyVdQueu4pY0rkGLJ-zZuH3vU3Xs5-RpfVDRJIhaDqzZieXJWGynSW3v6Ny6xpLmzP8XB6bYvGbf5_jtHP6h_pW6l3j1b80tgaCgYKATUSARQSFQHGX2MiX9E9XLZQ2ueWQ59rAkFX1g0206', '2025-09-13 09:31:22.034-05', 'primary', 'UTC', true, true, 30, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-09-13 08:31:06.805312-05', '2025-09-13 11:29:44.080872-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('c8d4c098-91e7-4a46-a332-a190da42122b', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//01iPS83wLS4n1CgYIARAAGAESNwF-L9IrC8BCa1EFT2q_gJSMEflBav86sad1hTBwLBEPbHvcEv1GVO9g2pYg_n3buqFNOvIr6NI', 'ya29.a0AS3H6NyukPj8w5hOOr1wbkRx0s5ft5-H6p5DzAK8RXEfifTJNGc537a6LtvbTo9tpkqSs8i5SX04WZjICSfnijQ07p_TOmlI5cFtQhDOiF223p0vNxLYXtMKrYUCCZSaP7M6SAA3dtnoH9J9tSmQFWNfjQ6DvmxtMiAgm2i-8poxBYTF4_YOK1PEX5Js6osDVtxh2hYaCgYKAcESARQSFQHGX2Mi-ScJjqNZSROyHBXRRy0giQ0206', '2025-09-13 12:30:05.541-05', 'primary', 'UTC', true, true, 30, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-09-13 11:29:44.090025-05', '2025-09-13 12:17:11.092104-05');
INSERT INTO vetplus_auth.google_calendar_config VALUES ('4843452e-6164-483e-9bb8-527927f3bb67', '54253011928-4vnccvis46n509hkm3oo975samb9sun0.apps.googleusercontent.com', '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', 'http://localhost:3000/api/google-calendar/callback', '1//01Ho7kyIegwFACgYIARAAGAESNwF-L9IriUfU_3hfgoICA1V558lY1ZxfRPblPuar3zbsCeju2RiJ8qRkGSo02R_SlwW2_nYXnLk', 'ya29.a0AS3H6NxgDsTKNayi_BW-Yows2eOKtBN2kyBTqYkrZc2PqhlC2Ph1ARCnqdTogI6dr-WHrU-j18261pUoN52-RvVYSK_ZQkm4NwHBbnCSjdzdq8wy8IOj4ihfM3phNA8gZSRTW5Ma6ZnjbXxgBwwU7keP_XMUCDUlO8ej4F3jFoZPp_e-B6gaK070Aq_a_HkCXiGyf18aCgYKAbMSARQSFQHGX2MiaoiY6E4Pg45gzSeURhf9Aw0206', '2025-09-13 13:17:22.348-05', 'primary', 'UTC', true, true, 30, 24, false, 'd8d48f8f-cfb1-4f3a-b2d8-2d5195a3861c', NULL, NULL, NULL, NULL, '2025-09-13 12:17:11.105911-05', '2025-09-13 16:48:42.746497-05');


--
-- Data for Name: password_resets; Type: TABLE DATA; Schema: vetplus_auth; Owner: postgres
--

INSERT INTO vetplus_auth.password_resets VALUES ('3552b5a3-ed04-493b-8619-72c0adfd7fc8', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'user_change', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'Cambio de contraseña temporal', true, '2025-07-23 12:52:41.646609', '2025-07-23 12:52:41.646609');
INSERT INTO vetplus_auth.password_resets VALUES ('ed739b04-9edd-481b-a89b-50799b043f34', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'user_change', '612b7d82-bf59-489a-8e1b-97c7dad91717', 'Cambio de contraseña temporal', true, '2025-08-20 21:23:33.906839', '2025-08-20 21:23:33.906839');
INSERT INTO vetplus_auth.password_resets VALUES ('d3feb839-e9e2-4b7f-8c02-c0d1ae953842', '31f56594-03da-4b11-ba03-0c0f6609e111', 'user_change', '31f56594-03da-4b11-ba03-0c0f6609e111', 'Cambio de contraseña temporal', true, '2025-08-21 12:27:57.707445', '2025-08-21 12:27:57.707445');
INSERT INTO vetplus_auth.password_resets VALUES ('66dd1f5b-72c8-4987-9d7b-ab2cd45a2729', 'fc6a9e30-0796-47d8-904d-ef2f1eaa0b20', 'user_change', 'fc6a9e30-0796-47d8-904d-ef2f1eaa0b20', 'Cambio de contraseña temporal', true, '2025-08-27 19:58:05.989905', '2025-08-27 19:58:05.989905');


--
-- Data for Name: sesiones; Type: TABLE DATA; Schema: vetplus_auth; Owner: postgres
--



--
-- Name: google_calendar_audit_log_id_seq; Type: SEQUENCE SET; Schema: clinical; Owner: postgres
--

SELECT pg_catalog.setval('clinical.google_calendar_audit_log_id_seq', 93, true);


--
-- PostgreSQL database dump complete
--

