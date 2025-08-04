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

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: appointments; Type: TABLE; Schema: public; Owner: acar
--

CREATE TABLE public.appointments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    business_id uuid NOT NULL,
    service_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    appointment_datetime timestamp with time zone NOT NULL,
    status text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT appointments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text, 'completed'::text])))
);


ALTER TABLE public.appointments OWNER TO acar;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: acar
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO acar;

--
-- Name: businesses; Type: TABLE; Schema: public; Owner: acar
--

CREATE TABLE public.businesses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    address text NOT NULL,
    latitude double precision NOT NULL,
    longitude double precision NOT NULL,
    phone text,
    email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.businesses OWNER TO acar;

--
-- Name: employee_availability; Type: TABLE; Schema: public; Owner: acar
--

CREATE TABLE public.employee_availability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT employee_availability_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);


ALTER TABLE public.employee_availability OWNER TO acar;

--
-- Name: employees; Type: TABLE; Schema: public; Owner: acar
--

CREATE TABLE public.employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.employees OWNER TO acar;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: acar
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    message text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO acar;

--
-- Name: reviews; Type: TABLE; Schema: public; Owner: acar
--

CREATE TABLE public.reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    appointment_id uuid NOT NULL,
    user_id uuid NOT NULL,
    business_id uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


ALTER TABLE public.reviews OWNER TO acar;

--
-- Name: services; Type: TABLE; Schema: public; Owner: acar
--

CREATE TABLE public.services (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    duration_minutes integer NOT NULL,
    price numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.services OWNER TO acar;

--
-- Name: users; Type: TABLE; Schema: public; Owner: acar
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['user'::text, 'business'::text])))
);


ALTER TABLE public.users OWNER TO acar;

--
-- Data for Name: appointments; Type: TABLE DATA; Schema: public; Owner: acar
--

COPY public.appointments (id, user_id, business_id, service_id, employee_id, appointment_datetime, status, created_at, updated_at) FROM stdin;
c5aec344-cff6-414a-813d-1b5c2a7353a7	828929ef-8163-4c83-a34d-793a301cf758	691bcf82-90bb-4391-ba30-8234e88fd121	bbbffd85-ad85-4ee3-aef1-922ecbf71661	82ce2d53-d232-43bb-a251-7c073076afb2	2025-08-04 09:00:00+03	completed	2025-07-30 15:46:06.816419+03	2025-07-30 15:46:06.816419+03
4e37ac7c-6c1f-45a4-866d-d3937c515d32	828929ef-8163-4c83-a34d-793a301cf758	691bcf82-90bb-4391-ba30-8234e88fd121	bbbffd85-ad85-4ee3-aef1-922ecbf71661	82ce2d53-d232-43bb-a251-7c073076afb2	2025-08-04 09:00:00+03	completed	2025-07-30 15:46:22.686859+03	2025-07-30 15:46:22.686859+03
b62dfb28-900f-41a5-9967-e2d8e7d7f88b	828929ef-8163-4c83-a34d-793a301cf758	691bcf82-90bb-4391-ba30-8234e88fd121	bbbffd85-ad85-4ee3-aef1-922ecbf71661	82ce2d53-d232-43bb-a251-7c073076afb2	2025-08-04 09:30:00+03	confirmed	2025-07-30 17:57:14.937267+03	2025-07-30 17:57:14.937267+03
2b7d9e4b-0b56-4965-b0e1-8ae8e93e0f67	828929ef-8163-4c83-a34d-793a301cf758	691bcf82-90bb-4391-ba30-8234e88fd121	bbbffd85-ad85-4ee3-aef1-922ecbf71661	82ce2d53-d232-43bb-a251-7c073076afb2	2025-08-04 09:00:00+03	confirmed	2025-07-30 17:56:55.528776+03	2025-07-30 17:56:55.528776+03
09f0b4e4-7a60-4d8a-aa75-5e3bdb4c526b	94623713-7491-4f4d-b34b-2d90b933236c	691bcf82-90bb-4391-ba30-8234e88fd121	bbbffd85-ad85-4ee3-aef1-922ecbf71661	82ce2d53-d232-43bb-a251-7c073076afb2	2025-08-04 12:00:00+03	pending	2025-08-04 15:38:57.974198+03	2025-08-04 15:38:57.974198+03
24827ca0-3098-4cf2-9bed-07d28186f6d9	94623713-7491-4f4d-b34b-2d90b933236c	691bcf82-90bb-4391-ba30-8234e88fd121	bbbffd85-ad85-4ee3-aef1-922ecbf71661	82ce2d53-d232-43bb-a251-7c073076afb2	2025-08-04 14:00:00+03	pending	2025-08-04 15:39:28.449556+03	2025-08-04 15:39:28.449556+03
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: acar
--

COPY public.audit_logs (id, user_id, action, details, created_at) FROM stdin;
\.


--
-- Data for Name: businesses; Type: TABLE DATA; Schema: public; Owner: acar
--

COPY public.businesses (id, owner_user_id, name, description, address, latitude, longitude, phone, email, created_at, updated_at) FROM stdin;
691bcf82-90bb-4391-ba30-8234e88fd121	14b3502b-8952-4e0e-a1d1-c7bb8a2326eb	işletmee1'ın İşletmesi		Sultanbeyli	40.992	29.083	5431209058	ahmet1@example.com	2025-07-30 15:06:15.337608+03	2025-07-30 15:06:15.337608+03
45bf24c5-2b8a-4e78-a565-f7492c924cd2	623f4a6a-e340-4997-af33-b5c298fb6cd7	yunus	asdben	Küçükbakkalköy, Dudullu Yolu Cad. Brandium Alışveriş Ve Yaşam Merkezi No:25-27, 34750 Ataşehir/İstanbul, Türkiye	40.98210113065513	29.132137298583984	5432786567	yunus@mail.com	2025-08-04 15:37:34.070795+03	2025-08-04 15:37:34.070795+03
\.


--
-- Data for Name: employee_availability; Type: TABLE DATA; Schema: public; Owner: acar
--

COPY public.employee_availability (id, employee_id, day_of_week, start_time, end_time, created_at, updated_at) FROM stdin;
2edddc95-9087-4642-9d90-7caeb7f6af38	82ce2d53-d232-43bb-a251-7c073076afb2	1	09:00:00	18:00:00	2025-07-30 15:29:41.765592+03	2025-07-30 15:29:41.765592+03
\.


--
-- Data for Name: employees; Type: TABLE DATA; Schema: public; Owner: acar
--

COPY public.employees (id, business_id, name, email, phone, created_at, updated_at) FROM stdin;
82ce2d53-d232-43bb-a251-7c073076afb2	691bcf82-90bb-4391-ba30-8234e88fd121	asdasda	l8678696@gmail.com	0 (543) 120 90 58	2025-07-30 15:29:34.270485+03	2025-07-30 15:29:34.270485+03
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: acar
--

COPY public.notifications (id, user_id, message, read, created_at) FROM stdin;
\.


--
-- Data for Name: reviews; Type: TABLE DATA; Schema: public; Owner: acar
--

COPY public.reviews (id, appointment_id, user_id, business_id, rating, comment, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: services; Type: TABLE DATA; Schema: public; Owner: acar
--

COPY public.services (id, business_id, name, description, duration_minutes, price, created_at, updated_at) FROM stdin;
bbbffd85-ad85-4ee3-aef1-922ecbf71661	691bcf82-90bb-4391-ba30-8234e88fd121	asdasdas	dasdasd	30	100.00	2025-07-30 15:29:24.353727+03	2025-07-30 15:29:24.353727+03
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: acar
--

COPY public.users (id, name, email, password_hash, role, created_at, updated_at) FROM stdin;
828929ef-8163-4c83-a34d-793a301cf758	yunus eren yalduz	ahmet@example.com	$2b$10$OGQ/D0mTH4B5.3VpihVGDedLRQX581WVSSrnPVuAM/7IGqq2nn67q	user	2025-07-30 14:49:51.175374+03	2025-07-30 14:49:51.175374+03
ba9b1ba0-6932-43e6-82c8-f68ba8cefa33	iletme 1	yalduzbey@gmail.com	$2b$10$BDOZ7nHDz6vhuJRGrqXn.uKBiDtByW.FOnFLOqFfDMAqP2RffskQi	business	2025-07-30 15:00:23.799794+03	2025-07-30 15:00:23.799794+03
14b3502b-8952-4e0e-a1d1-c7bb8a2326eb	işletmee1	ahmet1@example.com	$2b$10$G0sOO9WwKHg3LXms5US1MejshfbXUieMloy9OpaayD32qoxmr9M3e	business	2025-07-30 15:06:15.328833+03	2025-07-30 15:06:15.328833+03
c0df8a32-0507-4742-bcc2-b8f93d081601	yunus eren yalduz	yalduz@mail.com	$2b$10$nZpInL4LTOzmgA.KJqMQQOBRZXpWVKhGbnKdPl8FzNvYe4ewH9ree	business	2025-08-04 15:30:38.932337+03	2025-08-04 15:30:38.932337+03
94623713-7491-4f4d-b34b-2d90b933236c	yunus yalduz	yalduz@gmail.com	$2b$10$FK4fFETS8.GTLdriee9.jumvXWdknMEp/oHfj4vx.Xby9c1cmHnKG	user	2025-08-04 15:32:51.277263+03	2025-08-04 15:32:51.277263+03
623f4a6a-e340-4997-af33-b5c298fb6cd7	yunus	yunus@mail.com	$2b$10$3NnVkKEOIWiTNwhvi8cEuebcvoQFaW5twhGCbvCb1aYfTPru690F2	business	2025-08-04 15:37:34.056807+03	2025-08-04 15:37:34.056807+03
\.


--
-- Name: appointments appointments_pkey; Type: CONSTRAINT; Schema: public; Owner: acar
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: acar
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: businesses businesses_pkey; Type: CONSTRAINT; Schema: public; Owner: acar
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);


--
-- Name: employee_availability employee_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: acar
--

ALTER TABLE ONLY public.employee_availability
    ADD CONSTRAINT employee_availability_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: acar
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: acar
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: acar
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: acar
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: acar
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: acar
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_appointments_business_id; Type: INDEX; Schema: public; Owner: acar
--

CREATE INDEX idx_appointments_business_id ON public.appointments USING btree (business_id);


--
-- Name: idx_appointments_employee_id; Type: INDEX; Schema: public; Owner: acar
--

CREATE INDEX idx_appointments_employee_id ON public.appointments USING btree (employee_id);


--
-- Name: idx_appointments_user_id; Type: INDEX; Schema: public; Owner: acar
--

CREATE INDEX idx_appointments_user_id ON public.appointments USING btree (user_id);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: acar
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_businesses_owner_user_id; Type: INDEX; Schema: public; Owner: acar
--

CREATE INDEX idx_businesses_owner_user_id ON public.businesses USING btree (owner_user_id);


--
-- Name: idx_employee_availability_employee_id; Type: INDEX; Schema: public; Owner: acar
--

CREATE INDEX idx_employee_availability_employee_id ON public.employee_availability USING btree (employee_id);


--
-- Name: idx_employees_business_id; Type: INDEX; Schema: public; Owner: acar
--

CREATE INDEX idx_employees_business_id ON public.employees USING btree (business_id);


--
-- Name: idx_notifications_user_id; Type: INDEX; Schema: public; Owner: acar
--

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);


--
-- Name: idx_reviews_business_id; Type: INDEX; Schema: public; Owner: acar
--

CREATE INDEX idx_reviews_business_id ON public.reviews USING btree (business_id);


--
-- Name: idx_reviews_user_id; Type: INDEX; Schema: public; Owner: acar
--

CREATE INDEX idx_reviews_user_id ON public.reviews USING btree (user_id);


--
-- Name: idx_services_business_id; Type: INDEX; Schema: public; Owner: acar
--

CREATE INDEX idx_services_business_id ON public.services USING btree (business_id);


--
-- Name: appointments appointments_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acar
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acar
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acar
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: appointments appointments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acar
--

ALTER TABLE ONLY public.appointments
    ADD CONSTRAINT appointments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acar
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: businesses businesses_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acar
--

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: employee_availability employee_availability_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acar
--

ALTER TABLE ONLY public.employee_availability
    ADD CONSTRAINT employee_availability_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;


--
-- Name: employees employees_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acar
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acar
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_appointment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acar
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acar
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acar
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: services services_business_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: acar
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

