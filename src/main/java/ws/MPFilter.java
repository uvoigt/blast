/*
 * (c) Copyright 2016 Uwe Voigt
 * All Rights Reserved.
 */
package ws;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.PrintWriter;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

import javax.servlet.Filter;
import javax.servlet.FilterChain;
import javax.servlet.FilterConfig;
import javax.servlet.ServletException;
import javax.servlet.ServletOutputStream;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;
import javax.servlet.WriteListener;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletRequestWrapper;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpServletResponseWrapper;

import ws.Substitution.FilterDef;

@WebFilter(filterName = "MPFilter", urlPatterns = "*"
//, initParams = {@WebInitParam(name = "throttle.patterns", value = "\\.json$|\\.ogg$|\\.mp3$=204800" /* 200k per second */) }
)
public class MPFilter implements Filter {

	private class BufferingResponseWrapper extends HttpServletResponseWrapper {
		private BufferStream fBufferStream = new BufferStream();
		private PrintWriter fPrinter = new PrintWriter(fBufferStream);

		public BufferingResponseWrapper(HttpServletResponse response) {
			super(response);
		}

		@Override
		public ServletOutputStream getOutputStream() throws IOException {
			return fBufferStream;
		}

		@Override
		public PrintWriter getWriter() throws IOException {
			return fPrinter;
		}
	}

	private class BufferStream extends ServletOutputStream {
		private ByteArrayOutputStream fBuffer = new ByteArrayOutputStream();

		@Override
		public void write(int b) throws IOException {
			fBuffer.write(b);
		}

		@Override
		public boolean isReady() {
			return true;
		}

		@Override
		public void setWriteListener(WriteListener listener) {
		}
	}

	private class ThrottleRate {
		private Pattern pattern;
		private int rate;
		private ThrottleRate(String pattern, int rate) {
			this.pattern = Pattern.compile(pattern);
			this.rate = rate;
		}

		private int getThrottlingRate(String fileName) {
			if (pattern.matcher(fileName).find())
				return rate;
			return 0;
		}
	}

	private List<ThrottleRate> rates;

	@Override
	public void destroy() {
	}

	@Override
	public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
			throws IOException, ServletException {

		HttpServletRequest httpRequest = (HttpServletRequest) request;
		HttpServletResponse httpResponse = (HttpServletResponse) response;
		String uri = httpRequest.getRequestURI();

		
		int slashIndex = uri.lastIndexOf("/");
		String fileName = uri.substring(slashIndex + 1);

		int rate = getThrottlingRate(fileName);
		if (rate > 0) {
			request = new HttpServletRequestWrapper(httpRequest) {
				public String getMethod() {
					return "GET";
				}
			};
			response = new BufferingResponseWrapper(httpResponse);
		}

		FilterDef[] filterDefs = Substitution.INSTANCE.getFilters(fileName);
		if (filterDefs != null) {
			response = new BufferingResponseWrapper(httpResponse);
		}

		chain.doFilter(request, response);

		int responseStatus = httpResponse.getStatus();
		if (responseStatus == HttpServletResponse.SC_OK) {

			if (filterDefs != null) {
				response.getWriter().flush();
				BufferingResponseWrapper wrapper = (BufferingResponseWrapper) response;
				StringBuilder content = new StringBuilder(wrapper.fBufferStream.fBuffer.toString());
				for (int i = 0; i < filterDefs.length; i++) {
					FilterDef def = filterDefs[i];
					def.filter(content);
				}
				ServletResponse servletResponse = wrapper.getResponse();
				servletResponse.setContentLength(content.length());
				servletResponse.getWriter().print(content.toString());
			}
			if (rate > 0) {
				response.getWriter().flush();
				BufferingResponseWrapper wrapper = (BufferingResponseWrapper) response;
				byte[] content = wrapper.fBufferStream.fBuffer.toByteArray();
				ServletOutputStream out = wrapper.getResponse().getOutputStream();
				int bytesWritten = 0;
				long next = System.currentTimeMillis() + 1000;
				for (int i = 0; i < content.length; i++) {
					out.write(content[i]);
					if (bytesWritten < rate) {
						bytesWritten++;
					} else {
						long now = System.currentTimeMillis();
						if (now > next) {
							bytesWritten = 0;
							next = System.currentTimeMillis() + 1000;
						} else {
							try {
								Thread.sleep(next - now);
							} catch (InterruptedException e) {
								e.printStackTrace();
							}
						}
					}
				}
			}
		}
	}

	private int getThrottlingRate(String fileName) {
		if (rates != null) {
			for (ThrottleRate throttleRate : rates) {
				int rate = throttleRate.getThrottlingRate(fileName);
				if (rate != 0)
					return rate;
			}
		}
		return 0;
	}

	/**
	 * <p>Filter configuration via:</p>
	 *
	 * throttle.patterns=mp3$|ogg$=<rate per second>;...
	 */
	@Override
	public void init(FilterConfig config) throws ServletException {
		String value = config.getInitParameter("throttle.patterns");
		if (value != null) {
			rates = new ArrayList<>();
			for (String entry : value.split(";")) {
				String[] kvp = entry.split("=");
				if (kvp.length > 1) {
					try {
						rates.add(new ThrottleRate(kvp[0], Integer.parseInt(kvp[1])));
					} catch (NumberFormatException e) {
						throw new ServletException("Irregular throttle rate: " + kvp[1]);
					}
				}
			}
		}
	}
}
