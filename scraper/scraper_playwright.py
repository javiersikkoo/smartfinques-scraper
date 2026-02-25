from playwright.sync_api import sync_playwright

def scrape_properties():
    url = "https://www.inmuebles.smartfinques.com/?pag=1&idio=1#modulo-paginacion"
    properties = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url)
        page.wait_for_timeout(5000)  # espera que cargue la página

        # Ajusta los selectores según la web
        items = page.query_selector_all("div.property-card")  # <--- revisa el contenedor real
        for item in items:
            title = item.query_selector("h2")  # <--- revisa selector del título
            price = item.query_selector(".price")  # <--- revisa selector del precio
            url_item = item.query_selector("a")
            image = item.query_selector("img")
            
            properties.append({
                "title": title.inner_text() if title else "",
                "price": price.inner_text() if price else "",
                "url": url_item.get_attribute("href") if url_item else "",
                "image": image.get_attribute("src") if image else "",
            })
        browser.close()
    return properties
