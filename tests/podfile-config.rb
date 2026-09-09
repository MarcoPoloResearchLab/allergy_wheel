require 'fileutils'
require 'json'
require 'open3'
require 'tmpdir'

mobile = File.expand_path('../mobile', __dir__)
record = JSON.parse(File.read(File.join(mobile, 'native-preparation.json')))
failures = []

%w[valid missing malformed unavailable-prebuilt-service].each do |condition|
  Dir.mktmpdir('allergy-podfile-') do |fixture|
    record.fetch('files').each_key do |name|
      destination = File.join(fixture, name)
      FileUtils.mkdir_p(File.dirname(destination))
      FileUtils.cp(File.join(mobile, name), destination)
    end
    File.symlink(File.join(mobile, 'node_modules'), File.join(fixture, 'node_modules'))
    properties = File.join(fixture, 'ios/Podfile.properties.json')
    File.delete(properties) if condition == 'missing'
    File.write(properties, '{invalid JSON') if condition == 'malformed'
    env = { 'CI' => '1', 'NODE_ENV' => 'test', 'EXPO_NO_TELEMETRY' => '1', 'npm_config_offline' => 'true' }
    if condition == 'unavailable-prebuilt-service'
      network = File.join(fixture, 'unavailable-prebuilt-service.rb')
      File.write(network, <<~'RUBY')
        module UnavailablePrebuiltService
          def `(command)
            raise IOError, 'prebuilt artifact service unavailable' if command.include?('curl') && command.include?('-Iw')
            super
          end
        end
        Kernel.prepend(UnavailablePrebuiltService)
      RUBY
      env['RCT_USE_RN_DEP'] = '1'
      env['RCT_USE_PREBUILT_RNCORE'] = '1'
      env['EXPO_USE_PRECOMPILED_MODULES'] = '1'
      env['RUBYOPT'] = "#{ENV.fetch('RUBYOPT', '')} -r#{network}"
    end
    output, status = Open3.capture2e(env, 'pod', 'ipc', 'podfile', File.join(fixture, 'ios/Podfile'), chdir: File.join(fixture, 'ios'))
    accepted = if condition == 'unavailable-prebuilt-service'
      status.success? && output.include?('Building from source: true') && !output.include?('Building from source: false')
    elsif condition == 'valid'
      status.success? && output.include?('AllergyWheel')
    else
      !status.success? && output.include?('Podfile.properties.json')
    end
    puts "#{accepted ? 'PASS' : 'FAIL'}: CocoaPods evaluates #{condition} native properties"
    failures << "#{condition}: expected #{%w[valid unavailable-prebuilt-service].include?(condition) ? 'acceptance' : 'rejection'}\n#{output}" unless accepted
  end
end

abort(failures.join("\n")) unless failures.empty?
